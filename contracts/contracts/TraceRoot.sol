// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TraceRoot — Every Product Has a Story.
/// @notice Supply-chain provenance registry: batches, two-step custody handoffs,
///         quantity-conserving splits and merges, inspections, declared prices and recalls.
/// @dev    History is reconstructed from events; storage holds only current state and lineage.
///         Recall status is computed on-chain by walking a batch's ancestry, so a child batch
///         can never appear "safe" just because an off-chain indexer is lagging.
contract TraceRoot is AccessControl, Pausable {
    // ───────────────────────────── Roles ─────────────────────────────
    // DEFAULT_ADMIN_ROLE (from AccessControl) is the Administrator.
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant TRADER_ROLE = keccak256("TRADER_ROLE");
    bytes32 public constant TRANSPORTER_ROLE = keccak256("TRANSPORTER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    // ─────────────────────────── Constants ───────────────────────────
    /// @notice All prices are declared in INR minor units (paise). 1 INR = 100.
    string public constant CURRENCY = "INR";
    uint8 public constant CURRENCY_DECIMALS = 2;

    uint256 public constant MAX_SPLIT_PARTS = 20;
    uint256 public constant MAX_MERGE_SOURCES = 8;
    /// @notice Upper bound on the unfolded ancestry tree of any batch (keeps recall checks bounded).
    uint256 public constant MAX_LINEAGE = 64;
    uint256 public constant MAX_TEXT_BYTES = 96;
    uint256 public constant MAX_NOTE_BYTES = 280;
    uint64 public constant TRANSFER_TTL = 7 days;

    // ───────────────────────────── Types ─────────────────────────────
    enum Status {
        None, // batch does not exist
        Active, // held by a custodian, can move / split / merge / sell
        Consumed, // fully used as the source of a split or merge
        Sold // sold to consumers by a retailer
    }

    struct Batch {
        string product; // e.g. "Arabica coffee beans"
        string unit; // e.g. "kg"
        string origin; // e.g. "Chikmagalur, Karnataka"
        string evidenceCid; // optional IPFS CID of a photo / certificate
        uint128 quantity; // in `unit`, integer
        uint64 producedAt; // harvest / production date (unix seconds)
        uint64 createdAt;
        address producer;
        address custodian;
        Status status;
        bool recalled; // direct recall flag (see isRecalled for inherited recalls)
        uint16 lineageSize; // size of unfolded ancestry tree
        uint256[] parents;
        uint256[] children;
    }

    struct PendingTransfer {
        address to;
        uint64 expiresAt;
        uint128 price; // declared price in paise for the whole batch (0 = undisclosed)
    }

    // ───────────────────────────── State ─────────────────────────────
    uint256 public batchCount;
    mapping(uint256 => Batch) private _batches;
    mapping(uint256 => PendingTransfer) public pendingTransfer;
    /// @dev Block numbers in which events touching a batch were emitted. Lets a client fetch a
    ///      batch's history with exact-block log queries (works on rate-limited free RPCs).
    mapping(uint256 => uint64[]) private _eventBlocks;

    // ───────────────────────────── Events ────────────────────────────
    event BatchCreated(
        uint256 indexed batchId,
        address indexed producer,
        string product,
        uint128 quantity,
        string unit,
        string origin,
        uint64 producedAt,
        string evidenceCid
    );
    event TransferProposed(uint256 indexed batchId, address indexed from, address indexed to, uint128 price, uint64 expiresAt);
    event TransferAccepted(uint256 indexed batchId, address indexed from, address indexed to, uint128 price);
    event TransferCancelled(uint256 indexed batchId, address indexed by);
    event BatchSplit(uint256 indexed parentId, uint256[] childIds, uint128[] quantities);
    event BatchesMerged(uint256 indexed newBatchId, uint256[] sourceIds, uint128 totalQuantity);
    event InspectionRecorded(uint256 indexed batchId, address indexed inspector, uint8 grade, string reportCid, string notes);
    event ConditionRecorded(uint256 indexed batchId, address indexed recorder, int16 temperatureDeciC, uint16 humidityPermille, string note);
    event EvidenceAdded(uint256 indexed batchId, address indexed by, string kind, string cid);
    event BatchSold(uint256 indexed batchId, address indexed retailer, uint128 price);
    event BatchRecalled(uint256 indexed batchId, address indexed by, string reason);
    event RecallCleared(uint256 indexed batchId, address indexed by, string reason);

    // ───────────────────────────── Errors ────────────────────────────
    error BatchNotFound(uint256 batchId);
    error NotCustodian(uint256 batchId);
    error NotActive(uint256 batchId);
    error BatchIsRecalled(uint256 batchId);
    error TransferPending(uint256 batchId);
    error NoPendingTransfer(uint256 batchId);
    error TransferExpired(uint256 batchId);
    error NotRecipient(uint256 batchId);
    error RecipientNotParticipant(address to);
    error InvalidRecipient();
    error NotParticipant(address account);
    error InvalidQuantity();
    error InvalidPartCount();
    error QuantityMismatch(uint256 expected, uint256 provided);
    error IncompatibleBatches(uint256 a, uint256 b);
    error LineageTooLarge();
    error TextTooLong();
    error EmptyText();
    error InvalidGrade();
    error InvalidDate();
    error NotRecalled(uint256 batchId);
    error AlreadyRecalled(uint256 batchId);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidRecipient();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ─────────────────────────── Modifiers ───────────────────────────
    modifier exists(uint256 id) {
        if (_batches[id].status == Status.None) revert BatchNotFound(id);
        _;
    }

    modifier onlyCustodian(uint256 id) {
        if (_batches[id].status == Status.None) revert BatchNotFound(id);
        if (_batches[id].custodian != msg.sender) revert NotCustodian(id);
        if (!isParticipant(msg.sender)) revert NotParticipant(msg.sender);
        _;
    }

    // ──────────────────────────── Admin ──────────────────────────────
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─────────────────────────── Creation ────────────────────────────
    function createBatch(
        string calldata product,
        uint128 quantity,
        string calldata unit,
        string calldata origin,
        uint64 producedAt,
        string calldata evidenceCid
    ) external whenNotPaused onlyRole(PRODUCER_ROLE) returns (uint256 id) {
        _checkText(product, MAX_TEXT_BYTES, true);
        _checkText(unit, 16, true);
        _checkText(origin, MAX_TEXT_BYTES, true);
        _checkText(evidenceCid, MAX_TEXT_BYTES, false);
        if (quantity == 0) revert InvalidQuantity();
        if (producedAt == 0 || producedAt > block.timestamp) revert InvalidDate();

        id = ++batchCount;
        Batch storage b = _batches[id];
        b.product = product;
        b.unit = unit;
        b.origin = origin;
        b.evidenceCid = evidenceCid;
        b.quantity = quantity;
        b.producedAt = producedAt;
        b.createdAt = uint64(block.timestamp);
        b.producer = msg.sender;
        b.custodian = msg.sender;
        b.status = Status.Active;

        _touch(id);
        emit BatchCreated(id, msg.sender, product, quantity, unit, origin, producedAt, evidenceCid);
    }

    // ─────────────────────── Two-step handoffs ───────────────────────
    /// @notice Current custodian offers the batch to another participant, declaring a price.
    function proposeTransfer(uint256 id, address to, uint128 price) external whenNotPaused onlyCustodian(id) {
        _requireMovable(id);
        if (pendingTransfer[id].to != address(0)) revert TransferPending(id);
        if (to == address(0) || to == msg.sender) revert InvalidRecipient();
        if (!isParticipant(to)) revert RecipientNotParticipant(to);

        uint64 expiresAt = uint64(block.timestamp) + TRANSFER_TTL;
        pendingTransfer[id] = PendingTransfer(to, expiresAt, price);
        _touch(id);
        emit TransferProposed(id, msg.sender, to, price, expiresAt);
    }

    /// @notice Recipient confirms receipt. Only now does custody change.
    function acceptTransfer(uint256 id) external whenNotPaused exists(id) {
        PendingTransfer memory p = pendingTransfer[id];
        if (p.to == address(0)) revert NoPendingTransfer(id);
        if (p.to != msg.sender) revert NotRecipient(id);
        if (block.timestamp > p.expiresAt) revert TransferExpired(id);
        if (!isParticipant(msg.sender)) revert NotParticipant(msg.sender);
        if (_batches[id].status != Status.Active) revert NotActive(id);
        if (isRecalled(id)) revert BatchIsRecalled(id);

        address from = _batches[id].custodian;
        delete pendingTransfer[id];
        _batches[id].custodian = msg.sender;
        _touch(id);
        emit TransferAccepted(id, from, msg.sender, p.price);
    }

    /// @notice Sender may withdraw an offer at any time; the recipient may reject it.
    function cancelTransfer(uint256 id) external exists(id) {
        PendingTransfer memory p = pendingTransfer[id];
        if (p.to == address(0)) revert NoPendingTransfer(id);
        if (msg.sender != _batches[id].custodian && msg.sender != p.to) revert NotCustodian(id);
        delete pendingTransfer[id];
        _touch(id);
        emit TransferCancelled(id, msg.sender);
    }

    // ──────────────────── Quantity-conserving split ──────────────────
    /// @notice Fully consumes the parent into child batches whose quantities sum exactly to it.
    ///         For a partial split, include the remainder as one of the parts.
    function splitBatch(uint256 id, uint128[] calldata quantities)
        external
        whenNotPaused
        onlyCustodian(id)
        returns (uint256[] memory childIds)
    {
        _requireSplitMergeRole();
        _requireMovable(id);
        if (pendingTransfer[id].to != address(0)) revert TransferPending(id);
        uint256 n = quantities.length;
        if (n < 2 || n > MAX_SPLIT_PARTS) revert InvalidPartCount();

        Batch storage parent = _batches[id];
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            if (quantities[i] == 0) revert InvalidQuantity();
            sum += quantities[i];
        }
        if (sum != parent.quantity) revert QuantityMismatch(parent.quantity, sum);

        uint256 lineage = uint256(parent.lineageSize) + 1;
        if (lineage > MAX_LINEAGE) revert LineageTooLarge();

        parent.status = Status.Consumed;
        childIds = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 cid = ++batchCount;
            Batch storage c = _batches[cid];
            c.product = parent.product;
            c.unit = parent.unit;
            c.origin = parent.origin;
            c.evidenceCid = parent.evidenceCid;
            c.quantity = quantities[i];
            c.producedAt = parent.producedAt;
            c.createdAt = uint64(block.timestamp);
            c.producer = parent.producer;
            c.custodian = msg.sender;
            c.status = Status.Active;
            c.lineageSize = uint16(lineage);
            c.parents.push(id);
            parent.children.push(cid);
            childIds[i] = cid;
        }
        _touch(id);
        for (uint256 i; i < n; ++i) _touch(childIds[i]);
        emit BatchSplit(id, childIds, quantities);
    }

    // ──────────────────── Quantity-conserving merge ──────────────────
    /// @notice Combines compatible batches (same product and unit) held by the caller into one.
    function mergeBatches(uint256[] calldata ids) external whenNotPaused returns (uint256 newId) {
        _requireSplitMergeRole();
        uint256 n = ids.length;
        if (n < 2 || n > MAX_MERGE_SOURCES) revert InvalidPartCount();

        bytes32 productHash;
        bytes32 unitHash;
        uint256 total;
        uint256 lineage;
        uint64 earliest = type(uint64).max;

        for (uint256 i; i < n; ++i) {
            uint256 sid = ids[i];
            Batch storage s = _batches[sid];
            if (s.status == Status.None) revert BatchNotFound(sid);
            if (s.custodian != msg.sender) revert NotCustodian(sid);
            // Duplicates fail here: the first occurrence is already marked Consumed.
            if (s.status != Status.Active) revert NotActive(sid);
            if (isRecalled(sid)) revert BatchIsRecalled(sid);
            if (pendingTransfer[sid].to != address(0)) revert TransferPending(sid);

            bytes32 ph = keccak256(bytes(s.product));
            bytes32 uh = keccak256(bytes(s.unit));
            if (i == 0) {
                productHash = ph;
                unitHash = uh;
            } else if (ph != productHash || uh != unitHash) {
                revert IncompatibleBatches(ids[0], sid);
            }
            total += s.quantity;
            lineage += uint256(s.lineageSize) + 1;
            if (s.producedAt < earliest) earliest = s.producedAt;
            s.status = Status.Consumed;
        }
        if (lineage > MAX_LINEAGE) revert LineageTooLarge();
        if (total > type(uint128).max) revert InvalidQuantity();

        Batch storage first = _batches[ids[0]];
        newId = ++batchCount;
        Batch storage m = _batches[newId];
        m.product = first.product;
        m.unit = first.unit;
        m.origin = "Merged lot (see parent batches)";
        m.quantity = uint128(total);
        m.producedAt = earliest;
        m.createdAt = uint64(block.timestamp);
        m.producer = msg.sender;
        m.custodian = msg.sender;
        m.status = Status.Active;
        m.lineageSize = uint16(lineage);
        for (uint256 i; i < n; ++i) {
            m.parents.push(ids[i]);
            _batches[ids[i]].children.push(newId);
        }
        _touch(newId);
        for (uint256 i; i < n; ++i) _touch(ids[i]);
        emit BatchesMerged(newId, ids, uint128(total));
    }

    // ───────────────────── Inspections & conditions ──────────────────
    /// @param grade 1 (reject) … 5 (excellent). A record of what the inspector declared,
    ///        not an independent proof of physical quality.
    function recordInspection(uint256 id, uint8 grade, string calldata reportCid, string calldata notes)
        external
        whenNotPaused
        onlyRole(INSPECTOR_ROLE)
        exists(id)
    {
        if (grade < 1 || grade > 5) revert InvalidGrade();
        if (_batches[id].status == Status.Consumed) revert NotActive(id);
        _checkText(reportCid, MAX_TEXT_BYTES, false);
        _checkText(notes, MAX_NOTE_BYTES, false);
        _touch(id);
        emit InspectionRecorded(id, msg.sender, grade, reportCid, notes);
    }

    /// @notice Transporter in custody logs a condition reading (e.g. from a sensor).
    /// @param temperatureDeciC temperature in tenths of °C (e.g. 45 = 4.5 °C)
    /// @param humidityPermille relative humidity in tenths of a percent (0–1000)
    function recordCondition(uint256 id, int16 temperatureDeciC, uint16 humidityPermille, string calldata note)
        external
        whenNotPaused
        onlyCustodian(id)
        onlyRole(TRANSPORTER_ROLE)
    {
        if (_batches[id].status != Status.Active) revert NotActive(id);
        if (humidityPermille > 1000) revert InvalidQuantity();
        _checkText(note, MAX_NOTE_BYTES, false);
        _touch(id);
        emit ConditionRecorded(id, msg.sender, temperatureDeciC, humidityPermille, note);
    }

    /// @notice Custodian attaches off-chain evidence (photo, invoice, transport doc) by CID.
    function addEvidence(uint256 id, string calldata kind, string calldata cid) external whenNotPaused onlyCustodian(id) {
        _checkText(kind, 32, true);
        _checkText(cid, MAX_TEXT_BYTES, true);
        _touch(id);
        emit EvidenceAdded(id, msg.sender, kind, cid);
    }

    // ───────────────────────────── Sales ─────────────────────────────
    function markSold(uint256 id, uint128 price) external whenNotPaused onlyCustodian(id) onlyRole(RETAILER_ROLE) {
        _requireMovable(id);
        if (pendingTransfer[id].to != address(0)) revert TransferPending(id);
        _batches[id].status = Status.Sold;
        _touch(id);
        emit BatchSold(id, msg.sender, price);
    }

    // ──────────────────────────── Recalls ────────────────────────────
    /// @notice Admins and inspectors can recall any existing batch. Descendants inherit
    ///         the recall automatically through `isRecalled`.
    function recallBatch(uint256 id, string calldata reason) external exists(id) {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && !hasRole(INSPECTOR_ROLE, msg.sender)) {
            revert NotParticipant(msg.sender);
        }
        if (_batches[id].recalled) revert AlreadyRecalled(id);
        _checkText(reason, MAX_NOTE_BYTES, true);
        _batches[id].recalled = true;
        if (pendingTransfer[id].to != address(0)) {
            delete pendingTransfer[id];
            emit TransferCancelled(id, msg.sender);
        }
        _touch(id);
        emit BatchRecalled(id, msg.sender, reason);
    }

    /// @notice Only the Administrator can clear a recall.
    function clearRecall(uint256 id, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) exists(id) {
        if (!_batches[id].recalled) revert NotRecalled(id);
        _checkText(reason, MAX_NOTE_BYTES, true);
        _batches[id].recalled = false;
        _touch(id);
        emit RecallCleared(id, msg.sender, reason);
    }

    // ───────────────────────────── Views ─────────────────────────────
    function getBatch(uint256 id) external view exists(id) returns (Batch memory) {
        return _batches[id];
    }

    function getEventBlocks(uint256 id) external view exists(id) returns (uint64[] memory) {
        return _eventBlocks[id];
    }

    function getParents(uint256 id) external view exists(id) returns (uint256[] memory) {
        return _batches[id].parents;
    }

    function getChildren(uint256 id) external view exists(id) returns (uint256[] memory) {
        return _batches[id].children;
    }

    /// @notice True if this batch or any ancestor is recalled. Bounded by MAX_LINEAGE.
    function isRecalled(uint256 id) public view returns (bool) {
        Batch storage b = _batches[id];
        if (b.recalled) return true;
        uint256[] storage ps = b.parents;
        for (uint256 i; i < ps.length; ++i) {
            if (isRecalled(ps[i])) return true;
        }
        return false;
    }

    function isParticipant(address a) public view returns (bool) {
        return hasRole(PRODUCER_ROLE, a) || hasRole(TRADER_ROLE, a) || hasRole(TRANSPORTER_ROLE, a)
            || hasRole(INSPECTOR_ROLE, a) || hasRole(RETAILER_ROLE, a);
    }

    // ─────────────────────────── Internals ───────────────────────────
    function _touch(uint256 id) internal {
        uint64[] storage a = _eventBlocks[id];
        uint64 bn = uint64(block.number);
        if (a.length == 0 || a[a.length - 1] != bn) a.push(bn);
    }

    function _requireMovable(uint256 id) internal view {
        if (_batches[id].status != Status.Active) revert NotActive(id);
        if (isRecalled(id)) revert BatchIsRecalled(id);
    }

    function _requireSplitMergeRole() internal view {
        if (!hasRole(PRODUCER_ROLE, msg.sender) && !hasRole(TRADER_ROLE, msg.sender) && !hasRole(RETAILER_ROLE, msg.sender)) {
            revert NotParticipant(msg.sender);
        }
    }

    function _checkText(string calldata s, uint256 maxLen, bool required) internal pure {
        uint256 len = bytes(s).length;
        if (required && len == 0) revert EmptyText();
        if (len > maxLen) revert TextTooLong();
    }
}
