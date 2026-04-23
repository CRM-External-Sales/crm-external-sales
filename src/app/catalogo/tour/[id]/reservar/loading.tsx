import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function LoadingReservation() {
  return (
    <DashboardLayout>
      <div className="min-h-[70vh] bg-[#D6D3CC] px-4 py-6 sm:px-6">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-black/10" />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-xl md:p-14">
          <div className="mb-10 w-full text-center flex flex-col items-center gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="h-10 w-64 animate-pulse rounded-lg bg-neutral-200" />
          </div>

          <div className="w-full space-y-8">
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-neutral-100" />
            </div>

            <div className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-neutral-100" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
                <div className="h-14 w-full animate-pulse rounded-xl bg-neutral-100" />
              </div>
              <div className="space-y-3">
                <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
                <div className="h-14 w-full animate-pulse rounded-xl bg-neutral-100" />
              </div>
            </div>

            <div className="pt-2 pb-6 flex flex-col items-center gap-4">
              <div className="h-5 w-32 animate-pulse rounded bg-neutral-200" />
              <div className="flex gap-10">
                <div className="h-5 w-12 animate-pulse rounded bg-neutral-200" />
                <div className="h-5 w-12 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <div className="h-16 w-full sm:w-64 animate-pulse rounded-xl bg-[#4A6741]/40" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
