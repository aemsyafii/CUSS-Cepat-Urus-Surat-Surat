export default function ProfilLoading() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto animate-in fade-in duration-500">
      <div className="max-w-[600px] mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse border-4 border-white shadow-sm"></div>
          <div className="space-y-2 text-center flex flex-col items-center">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Card Form Skeleton */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-6">
            
            <div className="space-y-2">
               <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
               <div className="h-12 w-full bg-gray-50 rounded-xl animate-pulse"></div>
            </div>

            <div className="space-y-2">
               <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
               <div className="h-12 w-full bg-gray-50 rounded-xl animate-pulse"></div>
            </div>

            <div className="space-y-2">
               <div className="h-4 w-28 bg-gray-100 rounded animate-pulse"></div>
               <div className="h-12 w-full bg-gray-50 rounded-xl animate-pulse"></div>
            </div>

            <div className="pt-4">
               <div className="h-12 w-full bg-emerald-50 rounded-xl animate-pulse"></div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
