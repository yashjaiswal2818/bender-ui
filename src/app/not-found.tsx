import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-28 sm:px-6">
      <h1 className="display text-[clamp(2.4rem,5vw,3.6rem)]">That page isn’t here.</h1>
      <p className="mt-4 max-w-[46ch] text-[17px] leading-[1.6] text-ink-2">It may have moved, or the link had a typo. The components are all one click away.</p>
      <Link
        href="/components"
        className="mt-8 inline-flex h-12 items-center rounded-[14px] bg-primary px-6 text-[15px] font-medium text-on-primary transition-colors hover:bg-primary-hover"
      >
        Browse the components
      </Link>
    </div>
  );
}
