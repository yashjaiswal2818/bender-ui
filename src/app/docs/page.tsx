import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTransition } from '@/components/page-transition';
import { ShadcnAdd } from '@/components/shadcn-add';
import { SITE, registryUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'How to add a Bender UI component to your project: one command, a registry name, a prompt for your AI, or by hand.',
};

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="border-t border-line-2 py-(--band-y)">
      <h2 id={`${id}-t`} className="display text-[1.9rem]">
        {title}
      </h2>
      <div className="mt-4 flex max-w-[68ch] flex-col gap-4 text-[16px] leading-[1.65] text-ink-2">{children}</div>
    </section>
  );
}

const code = 'font-mono text-[13.5px] text-ink';

export default function DocsPage() {
  const example = registryUrl('bloom-menu');
  return (
    <PageTransition transitionKey="docs">
      <div className="mx-auto max-w-[860px] px-4 py-(--band-y) sm:px-6">
        <header className="pb-(--band-y)">
        <h1 className="display rise text-[clamp(2.4rem,4.6vw,3.6rem)]">How installing works</h1>
        <p className="rise mt-3 max-w-[56ch] text-[17px] leading-[1.6] text-ink-2" style={{ '--d': '0.08s' } as React.CSSProperties}>
          Components are plain files you copy into your project. There is no {SITE.name} package, so there is nothing to keep up to date.
        </p>
      </header>

      <Block id="requirements" title="What your project needs">
        <p>
          React 18 or newer and Tailwind CSS v4. The classes use v4 syntax, so a project on Tailwind v3 needs upgrading first. Most components also use{' '}
          <code className={code}>motion</code> and <code className={code}>lucide-react</code>; the install step adds them for you.
        </p>
      </Block>

      <Block id="one-command" title="With one command">
        <p>
          If your project has a <code className={code}>components.json</code> (it does if you use shadcn/ui), paste the link of the component you want:
        </p>
        <ShadcnAdd target={example} />
        <p>
          It writes the component into <code className={code}>components/ui</code>, adds the <code className={code}>cn</code> helper if you don&rsquo;t have one, and installs the packages it uses.
        </p>
      </Block>

      <Block id="by-name" title="By name, once you’ve added the registry">
        <p>
          Put this in <code className={code}>components.json</code> and every component installs by its name:
        </p>
        <pre className="overflow-x-auto rounded-[14px] border border-line bg-surface px-4 py-3.5 font-mono text-[13px] leading-relaxed text-ink">
          {`"registries": {\n  "@${SITE.namespace}": "${SITE.url}/r/{name}.json"\n}`}
        </pre>
        <ShadcnAdd target={`@${SITE.namespace}/bloom-menu`} />
      </Block>

      <Block id="prompt" title="Through your AI">
        <p>
          Every component page has a <strong className="font-semibold text-ink">Copy prompt</strong> button. The prompt carries the install steps, the props and the full source, so Cursor, Claude Code or any other tool can add the component without fetching anything.
        </p>
      </Block>

      <Block id="by-hand" title="By hand">
        <p>
          Open a component&rsquo;s <Link href="/components" transitionTypes={['nav-fade']} className="text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">page</Link>, choose <strong className="font-semibold text-ink">Manual</strong> under Install, install the listed packages and copy the file. Match the import paths to your project&rsquo;s aliases.
        </p>
      </Block>

      <Block id="motion" title="Motion and reduced motion">
        <p>
          The components animate with <code className={code}>motion</code> and move by default. If your app should honour the visitor&rsquo;s reduced-motion setting, wrap it once in{' '}
          <code className={code}>{'<MotionConfig reducedMotion="user">'}</code> and they fade instead of travel.
        </p>
      </Block>
      </div>
    </PageTransition>
  );
}
