import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
  withTopPadding?: boolean;
}

const PageWrapper = ({ children, className, withTopPadding = true }: PageWrapperProps) => {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12",
        withTopPadding && "pt-24",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PageWrapper;
