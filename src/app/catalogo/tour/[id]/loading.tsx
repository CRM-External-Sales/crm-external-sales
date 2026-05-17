import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function LoadingTourDetail() {
  return (
    <DashboardLayout>
      <div className="min-h-[70vh] bg-[#D6D3CC] px-4 py-6 sm:px-6">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-black/10" />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[2rem] bg-white p-6 shadow-lg md:flex-row md:p-8 lg:p-10">
          <div className="flex w-full flex-col md:w-[55%] space-y-6">
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-neutral-200" />
            <div className="h-6 w-1/4 animate-pulse rounded-full bg-neutral-200" />
            
            <div className="space-y-2 pt-4">
              <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
            </div>

            <div className="h-12 w-40 animate-pulse rounded-xl bg-[#4A6741]/40 mt-auto" />
          </div>
          <div className="w-full md:w-[45%]">
            <div className="h-full min-h-[300px] w-full animate-pulse rounded-2xl bg-neutral-200" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
