import Image from "next/image";

export const View = () => {
  return (
    <div className="relative flex flex-1 items-center justify-center min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="relative z-10 flex w-full max-w-[min(72vw,240px)] sm:max-w-[260px] justify-center px-4">
        <Image
          src="/rp-logo.svg"
          alt="Logo Río Perdido"
          width={320}
          height={320}
          className="h-auto w-full max-h-[min(20vh,200px)] sm:max-h-[min(22vh,220px)] object-contain"
          priority
          unoptimized
        />
      </div>
    </div>
  );
};
