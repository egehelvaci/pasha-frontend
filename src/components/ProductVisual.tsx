'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ProductVisual({ src, name }: { src?: string; name: string }) {
  const [failedSource, setFailedSource] = useState<string>();
  const available = src && failedSource !== src;
  return (
    <div className="relative aspect-square overflow-hidden bg-[#f3f1eb]">
      <Image src={available ? src : '/black-logo.svg'} alt={available ? name : `${name} — görsel hazırlanıyor`}
        fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
        unoptimized={Boolean(available)} onError={() => setFailedSource(src)}
        className={`object-contain p-6 transition-transform duration-500 group-hover:scale-[1.025] ${available ? '' : 'opacity-30'}`} />
    </div>
  );
}
