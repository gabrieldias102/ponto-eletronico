import { PontualLogo } from "@/components/brand/pontual-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-10">
      <PontualLogo className="[&_svg]:size-10 [&>span]:text-2xl" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
