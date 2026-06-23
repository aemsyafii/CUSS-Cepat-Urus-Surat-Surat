import Image from 'next/image';

interface ProfileHeroProps {
  title?: string;
  subtitle?: string;
  description?: string;
}

export default function ProfileHero({ 
  title = "CUSS", 
  description = "Sesuaikan informasi data diri Anda untuk keperluan pelayanan administrasi desa yang lebih akurat dan responsif."
}: ProfileHeroProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="-mb-8 w-full max-w-[450px]">
        <Image
          src="/hero-3d.png"
          alt="3D Office Architecture"
          width={450}
          height={310}
          className="w-full h-auto object-contain drop-shadow-xl pointer-events-none select-none"
          priority
          unoptimized
        />
      </div>

      <h2 className="text-[4.5rem] leading-none font-black text-[#1F2937] mb-5 tracking-tight -ml-1 relative z-10 flex items-end">
        {title}
        <span className="w-[18px] h-[18px] bg-[#23C16B] rounded-full inline-block ml-1.5 mb-[12px]"></span>
      </h2>
      <p className="text-[#4B5563] text-[15px] leading-relaxed max-w-[460px] font-medium relative z-10">
        {description}
      </p>
    </div>
  );
}
