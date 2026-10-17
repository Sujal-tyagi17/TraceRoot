// Offline fallback: when SOLC_LOCAL=1, compile with the solcjs npm package instead of
// downloading the native compiler (useful in sandboxed CI environments).
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

if (process.env.SOLC_LOCAL === "1") {
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
    if (args.solcVersion === "0.8.24") {
      const p = require.resolve("solc/soljson.js");
      return { compilerPath: p, isSolcJs: true, version: args.solcVersion, longVersion: "0.8.24+commit.e11b9ed9" };
    }
    return runSuper();
  });
}
