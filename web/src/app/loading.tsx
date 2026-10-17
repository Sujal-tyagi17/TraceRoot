import { RootLoader } from "@/components/Loader";

export default function Loading() {
  return <div className="flex min-h-[50vh] items-center justify-center"><RootLoader size={56} label="Loading page" /></div>;
}
