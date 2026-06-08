import { createFileRoute } from '@tanstack/react-router';
import { useLivePayload } from '../lib/context';
import { Panel } from '../components/Panel';

export const Route = createFileRoute('/map')({ component: MapPage });

function lonLatToSvg(lon: number, lat: number) {
  return { x: ((lon+180)/360)*800, y: ((90-lat)/180)*400 };
}

const GEO: Record<string,[number,number]> = {
  CN:[104.2,35.9],RU:[37.6,55.8],US:[-95.7,37.1],IN:[79.0,20.6],
  BR:[-51.9,-14.2],DE:[10.5,51.2],NL:[4.9,52.4],IR:[53.7,32.4],VN:[108.3,14.1]
};

export default function MapPage() {
  const payload = useLivePayload();
  const ips = payload?.state?.blocked_ips ?? [];
  return (
    <Panel title="World Threat Map" accent="red">
      <svg viewBox="0 0 800 400" className="w-full" style={{background:'oklch(0.14 0.02 240)'}}>
        {Array.from({length:13}).map((_,i)=><line key={`v${i}`} x1={i*800/12} y1={0} x2={i*800/12} y2={400} stroke="oklch(0.82 0.22 145 / 8%)" strokeWidth={1}/>)}
        {Array.from({length:7}).map((_,i)=><line key={`h${i}`} x1={0} y1={i*400/6} x2={800} y2={i*400/6} stroke="oklch(0.82 0.22 145 / 8%)" strokeWidth={1}/>)}
        {Object.entries(GEO).map(([cc,[lon,lat]])=>{
          const {x,y}=lonLatToSvg(lon,lat);
          return <circle key={cc} cx={x} cy={y} r={4} fill="oklch(0.82 0.22 145 / 30%)" stroke="oklch(0.82 0.22 145 / 50%)" strokeWidth={1}/>;
        })}
        {ips.slice(0,20).map((ip:string,i:number)=>{
          const x=50+((ip.charCodeAt(0)*37+i*97)%700);
          const y=30+((ip.charCodeAt(2)*53+i*61)%340);
          return (<g key={ip}><circle cx={x} cy={y} r={6} fill="oklch(0.65 0.28 25 / 40%)" stroke="oklch(0.65 0.28 25)" strokeWidth={1}/><circle cx={x} cy={y} r={12} fill="none" stroke="oklch(0.65 0.28 25 / 20%)" strokeWidth={1}/></g>);
        })}
      </svg>
      <p className="text-[10px] text-[var(--muted-foreground)] mt-2">{ips.length} IPs plotted — red dots = blocked</p>
    </Panel>
  );
}
