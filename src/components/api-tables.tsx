import type { ApiProp, ComponentApi } from '@/lib/source';

/** What a prop does when its source has no comment, for the few that explain themselves. */
const OBVIOUS: Record<string, string> = {
  className: 'Classes for the outer element.',
  id: 'A unique key.',
};

function Row({ p }: { p: ApiProp }) {
  const doc = p.doc || OBVIOUS[p.name] || '';
  return (
    <tr className="border-t border-line align-top">
      <td className="py-3.5 pl-5 pr-5 sm:pr-4">
        <code className="font-mono text-[13px] font-medium text-ink">{p.name}</code>
        {p.required && <span className="ml-2 text-[12px] text-ink-3">required</span>}
        <code className="mt-1 block font-mono text-[12.5px] leading-relaxed text-[#8fd3d8] [overflow-wrap:anywhere] sm:hidden">{p.type}</code>
        {doc && (
          <p className="mt-1 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-2">
            {doc.split(/(`[^`]+`)/).map((part, i) =>
              part.startsWith('`') ? (
                <code key={i} className="font-mono text-[12.5px] text-ink">
                  {part.slice(1, -1)}
                </code>
              ) : (
                part
              ),
            )}
          </p>
        )}
        {p.default && (
          <p className="mt-1 text-[13px] text-ink-3 sm:hidden">
            Default <code className="font-mono text-[12.5px] text-[#f3b193]">{p.default}</code>
          </p>
        )}
      </td>
      <td className="py-3.5 pr-4 max-sm:hidden">
        <code className="font-mono text-[12.5px] leading-relaxed text-[#8fd3d8] [overflow-wrap:anywhere]">{p.type}</code>
      </td>
      <td className="py-3.5 pr-5 max-sm:hidden">
        {p.default ? <code className="font-mono text-[12.5px] text-[#f3b193]">{p.default}</code> : <span className="text-ink-3">-</span>}
      </td>
    </tr>
  );
}

/** Props of the component, then the shapes it takes, read from its source when the site builds. */
export function ApiTables({ api }: { api: ComponentApi }) {
  return (
    <div className="flex flex-col gap-10">
      {api.types.map((t) => {
        const main = t.name === api.propsType;
        return (
          <section key={t.name} aria-label={t.name}>
            <h3 className="font-mono text-[15px] font-semibold text-ink">{main ? `<${api.component} />` : t.name}</h3>
            {(t.doc || t.extends) && (
              <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">
                {t.doc}
                {t.extends && ` Also takes everything ${t.extends} does.`}
              </p>
            )}
            {t.alias ? (
              <pre className="mt-3 overflow-x-auto rounded-[14px] border border-line bg-surface px-4 py-3 font-mono text-[12.5px] text-[#8fd3d8]">
                {t.alias}
              </pre>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-[16px] border border-line bg-surface">
                <table className="w-full text-left text-[13.5px] sm:min-w-[560px]">
                  <thead>
                    <tr className="text-[12.5px] text-ink-3">
                      <th scope="col" className="py-2.5 pl-5 pr-5 font-normal sm:w-[42%] sm:pr-4">Prop</th>
                      <th scope="col" className="py-2.5 pr-4 font-normal max-sm:hidden">Type</th>
                      <th scope="col" className="w-[16%] py-2.5 pr-5 font-normal max-sm:hidden">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.props?.map((p) => <Row key={p.name} p={p} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      {api.hooks.map((h) => (
        <section key={h.name} aria-label={h.name}>
          <h3 className="font-mono text-[15px] font-semibold text-ink">{h.name}</h3>
          {h.doc && <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">{h.doc}</p>}
        </section>
      ))}
    </div>
  );
}
