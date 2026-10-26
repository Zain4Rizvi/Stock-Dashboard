export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true">
      <p className="sr-only">Opening the page</p>
      <div className="page-bone h-12 w-2/5 max-w-sm rounded-2xl" />
      <div className="page-bone mt-5 h-4 w-3/5 max-w-xl rounded-full" style={{ animationDelay: "80ms" }} />
      <div className="page-bone mt-3 h-4 w-2/5 max-w-md rounded-full" style={{ animationDelay: "140ms" }} />
      <div className="page-bone mt-8 h-[min(28rem,52vh)] rounded-3xl" style={{ animationDelay: "200ms" }} />
    </div>
  );
}
