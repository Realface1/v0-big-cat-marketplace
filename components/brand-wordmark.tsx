"use client"

import Image from "next/image"

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`relative rounded-lg overflow-hidden bg-white border border-border flex-shrink-0 ${compact ? 'w-9 h-9' : 'w-10 h-10'}`}>
        <Image
          src="/image.png"
          alt="BigCat Marketplace logo"
          fill
          className="object-contain"
          sizes="40px"
        />
      </div>
      <div className="min-w-0">
        <p className={`font-bold text-foreground leading-none tracking-tight ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
          BigCat Marketplace
        </p>
      </div>
    </div>
  )
}

export function PoweredByMarquee() {
  const logos = [
    {
      src: '/SMEDAN_ido8Y4OzuL_0.png',
      alt: 'SMEDAN',
      className: 'h-5 w-auto',
      wrapperClassName: 'bg-emerald-950 border-emerald-900 px-2.5',
    },
    {
      src: '/palmpay-seeklogo.png',
      alt: 'PalmPay',
      className: 'h-5 w-auto',
      wrapperClassName: 'bg-white border-border px-2',
    },
    {
      src: '/image.png',
      alt: 'BigCat',
      className: 'h-5 w-auto',
      wrapperClassName: 'bg-white border-border px-2',
    },
  ]

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-[420px] overflow-hidden rounded-full border border-border bg-background/80 px-3 py-1.5">
        <div className="flex min-w-max items-center gap-5 whitespace-nowrap animate-[marquee_14s_linear_infinite]">
          {[...logos, ...logos].map((logo, index) => (
            <div key={`${logo.alt}-${index}`} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">powered by</span>
              <div className={`h-7 rounded-full border flex items-center ${logo.wrapperClassName}`}>
                <Image src={logo.src} alt={logo.alt} width={72} height={20} className={logo.className} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
