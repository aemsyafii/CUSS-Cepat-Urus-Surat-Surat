export default function AdminLoading() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-4 w-96 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="h-10 w-full sm:w-[300px] bg-gray-100 rounded-xl animate-pulse"></div>
          <div className="h-10 w-12 bg-gray-100 rounded-xl animate-pulse"></div>
        </div>
      </div>

      {/* Table/Content Skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="p-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-gray-50 last:border-0">
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-3 w-1/4 bg-gray-50 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
