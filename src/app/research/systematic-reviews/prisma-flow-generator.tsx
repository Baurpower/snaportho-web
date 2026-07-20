'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, HelpCircle, Plus, Trash2, TriangleAlert } from 'lucide-react';

type Reason = { id: string; label: string; count: number };
type Counts = { databases: number; registers: number; citation: number; other: number; duplicates: number; titleExcluded: number; notRetrieved: number; qualitative: number; quantitative: number };
const initial: Counts = { databases: 0, registers: 0, citation: 0, other: 0, duplicates: 0, titleExcluded: 0, notRetrieved: 0, qualitative: 0, quantitative: 0 };
const numberInput = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

export default function PrismaFlowGenerator() {
  const [counts, setCounts] = useState(initial);
  const [reasons, setReasons] = useState<Reason[]>([{ id: '1', label: 'Wrong population', count: 0 }, { id: '2', label: 'Wrong study design', count: 0 }, { id: '3', label: 'Wrong outcome', count: 0 }]);
  const [guide, setGuide] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const totals = useMemo(() => {
    const identified = counts.databases + counts.registers + counts.citation + counts.other;
    const screened = Math.max(0, identified - counts.duplicates);
    const sought = Math.max(0, screened - counts.titleExcluded);
    const assessed = Math.max(0, sought - counts.notRetrieved);
    const fullTextExcluded = reasons.reduce((sum, reason) => sum + reason.count, 0);
    return { identified, screened, sought, assessed, fullTextExcluded };
  }, [counts, reasons]);
  const errors = useMemo(() => {
    const messages: string[] = [];
    if (counts.duplicates > totals.identified) messages.push('Duplicate records exceed all identified records.');
    if (counts.titleExcluded > totals.screened) messages.push('More records are excluded than screened.');
    if (counts.notRetrieved > totals.sought) messages.push('Reports not retrieved exceed reports sought.');
    if (totals.fullTextExcluded + counts.qualitative > totals.assessed) messages.push('Full-text exclusions plus included studies exceed reports assessed.');
    if (totals.assessed > 0 && totals.fullTextExcluded + counts.qualitative < totals.assessed) messages.push('Some assessed full-text reports are not accounted for as excluded or included.');
    if (counts.quantitative > counts.qualitative) messages.push('Meta-analysis studies exceed all included studies.');
    return messages;
  }, [counts, totals]);

  const setCount = (key: keyof Counts, value: string) => setCounts(current => ({ ...current, [key]: Math.max(0, Number.parseInt(value || '0', 10) || 0) }));
  const svgString = () => new XMLSerializer().serializeToString(svgRef.current!);
  const download = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); };
  const exportSvg = () => download(new Blob([svgString()], { type: 'image/svg+xml;charset=utf-8' }), 'prisma-2020-flow-diagram.svg');
  const exportPng = async () => { const image = new Image(); const url = URL.createObjectURL(new Blob([svgString()], { type: 'image/svg+xml' })); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url; }); const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 3200; const context = canvas.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); canvas.toBlob(blob => blob && download(blob, 'prisma-2020-flow-diagram.png'), 'image/png', 1); };
  const exportPdf = async () => { const { jsPDF } = await import('jspdf'); const image = new Image(); const url = URL.createObjectURL(new Blob([svgString()], { type: 'image/svg+xml' })); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url; }); const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 2400; canvas.getContext('2d')!.drawImage(image, 0, 0, 1800, 2400); URL.revokeObjectURL(url); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 15, 12, 180, 240); pdf.save('prisma-2020-flow-diagram.pdf'); };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">PRISMA 2020</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">PRISMA Flow Diagram</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Every systematic review should transparently document how studies were identified, screened, and ultimately included. Reviewers expect a clear accounting of every article removed throughout the process. Fortunately, creating the figure is straightforward once you know your final screening numbers.</p>
      <button onClick={() => setGuide(!guide)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><HelpCircle className="h-4 w-4"/> Help me determine my PRISMA numbers</button>
      {guide && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2"><p><b>1.</b> How many records did you export from every database and register?</p><p><b>2.</b> How many duplicates did your reference manager remove?</p><p><b>3.</b> How many titles and abstracts failed eligibility?</p><p><b>4.</b> How many full texts were unavailable, excluded, and included?</p></div>}
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <InputGroup title="Identification"><NumberField label="Records identified from databases" value={counts.databases} onChange={v=>setCount('databases',v)}/><NumberField label="Records identified from registers" value={counts.registers} onChange={v=>setCount('registers',v)}/><NumberField label="Records identified through citation searching" value={counts.citation} onChange={v=>setCount('citation',v)}/><NumberField label="Records identified through other sources" value={counts.other} onChange={v=>setCount('other',v)}/><NumberField label="Duplicate records removed" value={counts.duplicates} onChange={v=>setCount('duplicates',v)}/><Calculated label="Total identified" value={totals.identified}/></InputGroup>
        <InputGroup title="Screening"><Calculated label="Records screened" value={totals.screened}/><NumberField label="Records excluded during title/abstract review" value={counts.titleExcluded} onChange={v=>setCount('titleExcluded',v)}/></InputGroup>
        <InputGroup title="Eligibility"><Calculated label="Full-text reports sought" value={totals.sought}/><NumberField label="Reports not retrieved" value={counts.notRetrieved} onChange={v=>setCount('notRetrieved',v)}/><Calculated label="Full-text reports assessed" value={totals.assessed}/><div className="mt-3 border-t border-slate-200 pt-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">Full-text exclusion reasons</p><button onClick={()=>setReasons(current=>[...current,{id:crypto.randomUUID(),label:'',count:0}])} className="rounded-md border border-slate-300 p-1"><Plus className="h-3.5 w-3.5"/></button></div>{reasons.map(reason=><div key={reason.id} className="mt-2 grid grid-cols-[1fr_72px_30px] gap-2"><input aria-label="Exclusion reason" value={reason.label} onChange={e=>setReasons(current=>current.map(r=>r.id===reason.id?{...r,label:e.target.value}:r))} placeholder="Reason" className={numberInput}/><input aria-label={`${reason.label||'Reason'} count`} type="number" min="0" value={reason.count} onChange={e=>setReasons(current=>current.map(r=>r.id===reason.id?{...r,count:Math.max(0,Number(e.target.value))}:r))} className={numberInput}/><button aria-label="Remove reason" onClick={()=>setReasons(current=>current.filter(r=>r.id!==reason.id))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4"/></button></div>)}<Calculated label="Full-text reports excluded" value={totals.fullTextExcluded}/></div></InputGroup>
        <InputGroup title="Included"><NumberField label="Studies included in qualitative synthesis" value={counts.qualitative} onChange={v=>setCount('qualitative',v)}/><NumberField label="Studies included in meta-analysis" value={counts.quantitative} onChange={v=>setCount('quantitative',v)}/></InputGroup>
      </section>

      <div className="space-y-4 xl:sticky xl:top-24">
        {errors.length>0 && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="flex items-center gap-2 font-semibold"><TriangleAlert className="h-4 w-4"/>Numbers do not reconcile</p>{errors.map(error=><p key={error} className="mt-1">× {error}</p>)}</div>}
        <section className={`overflow-auto rounded-2xl border bg-white p-4 shadow-sm ${errors.length?'border-rose-300':'border-slate-200'}`}><PrismaSvg ref={svgRef} counts={counts} reasons={reasons} totals={totals}/></section>
        <div className="flex flex-wrap gap-2"><ExportButton label="SVG" onClick={exportSvg} disabled={errors.length>0}/><ExportButton label="PNG · high resolution" onClick={exportPng} disabled={errors.length>0}/><ExportButton label="PDF" onClick={exportPdf} disabled={errors.length>0}/><span className="self-center text-xs text-slate-500">Exports unlock when all counts reconcile.</span></div>
      </div>
    </div>
  </div>;
}

function InputGroup({title,children}:{title:string;children:React.ReactNode}) { return <fieldset className="mb-6"><legend className="mb-3 font-serif text-lg font-semibold">{title}</legend><div className="space-y-3">{children}</div></fieldset> }
function NumberField({label,value,onChange}:{label:string;value:number;onChange:(v:string)=>void}) { return <label className="grid grid-cols-[1fr_88px] items-center gap-3 text-xs leading-4 text-slate-600"><span>{label}</span><input type="number" min="0" value={value} onChange={e=>onChange(e.target.value)} className={numberInput}/></label> }
function Calculated({label,value}:{label:string;value:number}) { return <div className="grid grid-cols-[1fr_88px] items-center gap-3 text-xs font-semibold text-slate-700"><span>{label}<span className="block font-normal text-slate-400">Calculated</span></span><output className="rounded-lg bg-slate-100 px-3 py-2 text-right text-sm tabular-nums">{value}</output></div> }
function ExportButton({label,onClick,disabled}:{label:string;onClick:()=>void;disabled:boolean}) { return <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"><Download className="h-4 w-4"/>{label}</button> }

const PrismaSvg = ({ref,counts,reasons,totals}:{ref:React.Ref<SVGSVGElement>;counts:Counts;reasons:Reason[];totals:{identified:number;screened:number;sought:number;assessed:number;fullTextExcluded:number}}) => {
  const validReasons=reasons.filter(r=>r.label||r.count); const reasonLines=validReasons.length?validReasons.map(r=>`${r.label||'Other reason'} (n = ${r.count})`):['Reasons not yet entered'];
  const Box=({x,y,w=410,h=88,lines}:{x:number;y:number;w?:number;h?:number;lines:string[]})=><g><rect x={x} y={y} width={w} height={h} fill="white" stroke="#111827" strokeWidth="2"/><text x={x+w/2} y={y+30} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fill="#111827">{lines.map((line,i)=><tspan key={line+i} x={x+w/2} dy={i?25:0} fontWeight={i===0?600:400}>{line}</tspan>)}</text></g>;
  const Arrow=({x1,y1,x2,y2}:{x1:number;y1:number;x2:number;y2:number})=><path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#111827" strokeWidth="2" fill="none" markerEnd="url(#arrow)"/>;
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" role="img" aria-label="PRISMA 2020 flow diagram" className="mx-auto min-w-[620px] max-w-[760px] bg-white"><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#111827"/></marker></defs><rect width="900" height="1200" fill="white"/><text x="450" y="40" textAnchor="middle" fontFamily="Arial" fontSize="24" fontWeight="700">PRISMA 2020 flow diagram</text>
    <text x="28" y="115" fontFamily="Arial" fontSize="17" fontWeight="700" transform="rotate(-90 28 115)">IDENTIFICATION</text><Box x={70} y={75} lines={[`Records identified from databases (n = ${counts.databases})`,`Registers (n = ${counts.registers})`]}/><Box x={520} y={75} w={330} lines={[`Other methods (n = ${counts.citation+counts.other})`,`Citation searching / other sources`]}/><Arrow x1={275} y1={163} x2={275} y2={205}/><Arrow x1={685} y1={163} x2={685} y2={205}/><Box x={70} y={205} lines={[`Records after duplicates removed`,`(n = ${totals.screened})`]}/><Box x={520} y={205} w={330} lines={[`Duplicate records removed`,`(n = ${counts.duplicates})`]}/>
    <text x="28" y="420" fontFamily="Arial" fontSize="17" fontWeight="700" transform="rotate(-90 28 420)">SCREENING</text><Arrow x1={275} y1={293} x2={275} y2={345}/><Box x={70} y={345} lines={[`Records screened`,`(n = ${totals.screened})`]}/><Arrow x1={480} y1={389} x2={515} y2={389}/><Box x={520} y={345} w={330} lines={[`Records excluded`,`(n = ${counts.titleExcluded})`]}/><Arrow x1={275} y1={433} x2={275} y2={485}/><Box x={70} y={485} lines={[`Reports sought for retrieval`,`(n = ${totals.sought})`]}/><Arrow x1={480} y1={529} x2={515} y2={529}/><Box x={520} y={485} w={330} lines={[`Reports not retrieved`,`(n = ${counts.notRetrieved})`]}/>
    <text x="28" y="700" fontFamily="Arial" fontSize="17" fontWeight="700" transform="rotate(-90 28 700)">ELIGIBILITY</text><Arrow x1={275} y1={573} x2={275} y2={625}/><Box x={70} y={625} lines={[`Reports assessed for eligibility`,`(n = ${totals.assessed})`]}/><Arrow x1={480} y1={669} x2={515} y2={669}/><Box x={520} y={605} w={330} h={Math.max(128,65+reasonLines.length*24)} lines={[`Reports excluded (n = ${totals.fullTextExcluded})`,...reasonLines]}/>
    <text x="28" y="950" fontFamily="Arial" fontSize="17" fontWeight="700" transform="rotate(-90 28 950)">INCLUDED</text><Arrow x1={275} y1={713} x2={275} y2={805}/><Box x={70} y={805} lines={[`Studies included in review`,`(n = ${counts.qualitative})`]}/><Arrow x1={275} y1={893} x2={275} y2={965}/><Box x={70} y={965} lines={[`Studies included in meta-analysis`,`(n = ${counts.quantitative})`]}/><text x="450" y="1160" textAnchor="middle" fontFamily="Arial" fontSize="13" fill="#64748b">Generated with SnapOrtho Research 101 · PRISMA 2020 structure</text>
  </svg>;
};
