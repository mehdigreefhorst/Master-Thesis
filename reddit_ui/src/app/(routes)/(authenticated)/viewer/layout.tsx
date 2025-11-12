
import { ViewerSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";

export default function ViewerPage( {
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<ViewerSkeleton />}>
      {children}
    </Suspense>
  );
}
