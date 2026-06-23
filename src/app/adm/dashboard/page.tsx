'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, ReferenceLine, AreaChart, Area
} from 'recharts';
import {
  format, subMonths, startOfMonth, endOfMonth,
  startOfDay, endOfDay, eachHourOfInterval, isSameDay,
  differenceInMinutes, subHours, subDays
} from 'date-fns';
import Link from 'next/link';
import { id } from 'date-fns/locale';
import { createBrowserSupabase } from '@/lib/supabase/client';

import { useAdminData } from '../AdminDataContext';

export default function AdminDashboardPage() {
  const { statsSurat, loadingStats: loadingContext, refreshSurat } = useAdminData();
  const [timeRange, setTimeRange] = useState(1);
  const [demografiFilter, setDemografiFilter] = useState<'diri_sendiri' | 'diwakili'>('diri_sendiri');
  const [showAvgLabel, setShowAvgLabel] = useState(false);

  const processedData = useMemo(() => {
    if (!statsSurat || statsSurat.length === 0) return null;

    try {
      const allSurat = statsSurat;
      // 1. Calculate Time Range Boundaries
      const now = new Date();
      const rangeStart = timeRange === 1 ? startOfDay(subDays(now, 29)) : startOfMonth(subMonths(now, timeRange - 1));
      const prevRangeStart = startOfMonth(subMonths(rangeStart, timeRange));
      const prevRangeEnd = new Date(rangeStart.getTime() - 1);

      // Filter data for periods
      const dataInRange = allSurat.filter(s => {
        const d = new Date(s.created_at);
        return d >= rangeStart;
      });

      // 2. Helper function to calculate common stats
      const getPeriodStats = (rangeS: Date, rangeE: Date) => {
        const entriesInRange = allSurat.filter(s => {
          const d = new Date(s.created_at);
          return d >= rangeS && d <= rangeE;
        });
        const total = entriesInRange.length;

        const selesaiList = allSurat.filter(s => {
          const isFin = s.status === 'Selesai' || s.status === 'Ditolak';
          const cd = new Date(s.tanggal_disetujui || s.tanggal_ditolak || s.updated_at || s.created_at);
          return isFin && cd >= rangeS && cd <= rangeE;
        });
        const selesai = selesaiList.length;

        const finishedFromCohort = entriesInRange.filter(s => s.status === 'Selesai' || s.status === 'Ditolak').length;
        const completionRate = total > 0 ? Math.round((finishedFromCohort / total) * 100) : 0;
        const diproses = entriesInRange.filter(s => s.status === 'Diproses').length;

        let avgMinutes = 0;
        if (selesai > 0) {
          const totalMinutes = selesaiList.reduce((acc, s) => {
            const start = new Date(s.created_at);
            const end = new Date(s.tanggal_disetujui || s.tanggal_ditolak || s.updated_at || s.created_at);
            return acc + Math.abs(differenceInMinutes(end, start));
          }, 0);
          avgMinutes = Math.round(totalMinutes / selesai);
        }
        return { total, selesai, diproses, completionRate, avgMinutes };
      };

      const currentP = getPeriodStats(rangeStart, now);
      const prevP = getPeriodStats(prevRangeStart, prevRangeEnd);

      // Format Avg Time String
      let avgTimeStr = '0m';
      if (currentP.avgMinutes > 0) {
        if (currentP.avgMinutes >= 60) {
          avgTimeStr = `${Math.floor(currentP.avgMinutes / 60)}j ${currentP.avgMinutes % 60}m`;
        } else {
          avgTimeStr = `${currentP.avgMinutes}m`;
        }
      }

      // 3. Trends & Comparison
      const literalTrends = {
        totalUp: currentP.total >= prevP.total,
        selesaiUp: currentP.selesai >= prevP.selesai,
        completionUp: currentP.completionRate >= prevP.completionRate,
        diprosesUp: currentP.diproses >= prevP.diproses,
        avgTimeUp: currentP.avgMinutes >= prevP.avgMinutes
      };

      // 4. Sparkline Data Points
      const generateSparklines = (status: string) => {
        const points = 6;
        const timeSpan = now.getTime() - rangeStart.getTime();
        const bucketSize = timeSpan / points;
        
        return Array.from({ length: points }).map((_, i) => {
          const bucketStart = new Date(rangeStart.getTime() + i * bucketSize);
          const bucketEnd = new Date(bucketStart.getTime() + bucketSize);
          
          const count = allSurat.filter(s => {
            let activityDate;
            let isMatch = false;
            if (status === 'Selesai') {
              isMatch = s.status === 'Selesai' || s.status === 'Ditolak';
              activityDate = new Date(s.tanggal_disetujui || s.tanggal_ditolak || s.created_at);
            } else if (status === 'Diproses') {
              isMatch = s.status === 'Diproses';
              activityDate = new Date(s.tanggal_diproses || s.created_at);
            } else {
              isMatch = true;
              activityDate = new Date(s.created_at);
            }
            return isMatch && activityDate >= bucketStart && activityDate <= bucketEnd;
          }).length;
          return { v: count };
        });
      };

      const selesaiChart = generateSparklines('Selesai');
      const diprosesChart = generateSparklines('Diproses');
      const totalChart = generateSparklines('Total');

      const last24h = subHours(now, 24);
      const masuk24h = allSurat.filter(s => new Date(s.created_at) >= last24h).length;
      const selesai24h = allSurat.filter(s => (s.status === 'Selesai' || s.status === 'Ditolak') && new Date(s.tanggal_disetujui || s.tanggal_ditolak || s.created_at) >= last24h).length;
      const diproses24h = allSurat.filter(s => s.status === 'Diproses' && new Date(s.tanggal_diproses || s.created_at) >= last24h).length;

      // 5. Demographics
      const totalSelf = dataInRange.filter(s => !s.subjek || !s.subjek.nama).length;
      const totalRepresented = dataInRange.filter(s => s.subjek?.nama).length;

      const getGender = (s: any) => {
        if (s.subjek?.jenis_kelamin) return s.subjek.jenis_kelamin?.toLowerCase();
        const wg = s.pemohon;
        return wg?.jenis_kelamin?.toLowerCase();
      };

      const male = dataInRange.filter(s => !s.is_mewakili && getGender(s) === 'laki-laki').length;
      const female = dataInRange.filter(s => !s.is_mewakili && getGender(s) === 'perempuan').length;
      const maleRepresented = dataInRange.filter(s => s.is_mewakili && getGender(s) === 'laki-laki').length;
      const femaleRepresented = dataInRange.filter(s => s.is_mewakili && getGender(s) === 'perempuan').length;

      const selesaiSelf = dataInRange.filter(s => (!s.subjek || !s.subjek.nama) && (s.status === 'Selesai' || s.status === 'Ditolak')).length;
      const selesaiRepresented = dataInRange.filter(s => s.subjek?.nama && (s.status === 'Selesai' || s.status === 'Ditolak')).length;

      const sorted = [...allSurat].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const recent = sorted.slice(0, 4);

      // 6. Analisis Pengajuan Chart Data
      let chartDataArray: any[] = [];
      const currentDay = now.getDate();
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentHour = now.getHours() || 1;
      
      if (timeRange === 1) {
        // ADD LEFT SPACER FOR SYMMETRY
        chartDataArray.push({
          name: '', val: 0, prediction: 0, fill: 'transparent', isSpacer: true
        });

        for (let i = 29; i >= 0; i--) {
          const d = subDays(now, i);
          const dayStart = startOfDay(d);
          const dayEnd = endOfDay(d);
          const count = allSurat.filter(s => {
            const sd = new Date(s.created_at);
            return sd >= dayStart && sd <= dayEnd;
          }).length;

          let prediction = 0;
          if (i === 0) {
            const estToday = Math.round(count * (24 / currentHour));
            if (estToday > count) prediction = estToday - count;
          }

          chartDataArray.push({
            name: format(d, 'dd MMM', { locale: id }),
            val: count,
            prediction,
            fill: i === 0 ? '#7eb39eff' : '#E2E8F0',
            isToday: i === 0,
            date: d.getDate()
          });
        }

        // TAMBAH PREDIKSI BESOK (7-DAY TREND)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowLabel = format(tomorrow, 'dd MMM', { locale: id });
        
        // Calculate trend from last 7 days for better "90% accuracy" feeling
        const last7Days = chartDataArray.slice(-7);
        const sevenDayAvg = Math.round(last7Days.reduce((acc, curr) => acc + curr.val, 0) / 7);
        const historyAvg = Math.max(1, sevenDayAvg); 

        chartDataArray.push({
          name: 'tomorrow', val: 0, prediction: historyAvg, fill: '#E2E8F0', isGhost: true, isToday: false, tooltipName: tomorrowLabel, date: tomorrow.getDate()
        });
      } else {
        for (let i = timeRange - 1; i >= 0; i--) {
          const d = subMonths(now, i);
          const monthStart = startOfMonth(d);
          const monthEnd = endOfMonth(d);
          const monthLabel = format(d, 'MMM', { locale: id });
          const count = allSurat.filter(s => {
            const sd = new Date(s.created_at);
            return sd >= monthStart && sd <= monthEnd;
          }).length;

          let prediction = 0;
          if (i === 0) {
            const estMonth = Math.round(count * (daysInCurrentMonth / Math.max(1, currentDay)));
            if (estMonth > count) prediction = estMonth - count;
          }

          chartDataArray.push({
            name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            val: count,
            prediction,
            fill: i === 0 ? '#7eb39eff' : '#E2E8F0',
            isToday: i === 0
          });
        }
      }

      // Spacers for month view symmetry
      let finalChartData = chartDataArray;
      if (timeRange > 1) {
        finalChartData = chartDataArray.flatMap(m => [
          { val: Math.round(m.val * 0.3), prediction: 0, fill: '#E2E8F0', name: '', isToday: false },
          { val: m.val, prediction: m.prediction, fill: m.fill, name: m.name, isToday: m.isToday, isGhost: m.isGhost },
          { val: Math.round(m.val * 0.5), prediction: 0, fill: '#E2E8F0', name: '', isToday: false }
        ]);
      }

      // 7. Daily Chart Data
      const dayInterval = eachHourOfInterval({ start: subHours(now, 23), end: now });
      const dailyChartData = dayInterval.map(h => {
        const hStr = format(h, 'HH:00');
        const masuk = allSurat.filter(s => {
          const sd = new Date(s.created_at);
          return Math.abs(differenceInMinutes(sd, h)) < 60 && sd.getHours() === h.getHours() && isSameDay(sd, h);
        }).length;
        const selesai = allSurat.filter(s => {
          const isMatch = s.status === 'Selesai' || s.status === 'Ditolak';
          const activityDate = s.tanggal_disetujui || s.tanggal_ditolak || s.created_at;
          const ad = new Date(activityDate);
          return isMatch && Math.abs(differenceInMinutes(ad, h)) < 60 && ad.getHours() === h.getHours() && isSameDay(ad, h);
        }).length;
        return { time: hStr, masuk, selesai };
      });

      return {
        stats: {
          total: currentP.total, selesai: currentP.selesai, diproses: currentP.diproses, masuk: masuk24h,
          masuk24h, selesai24h, diproses24h, avgTime: avgTimeStr, completionRate: currentP.completionRate,
          male, female, maleRepresented, femaleRepresented, selesaiSelf, selesaiRepresented, totalSelf, totalRepresented,
          recent, selesaiChart, diprosesChart, totalChart, avgMinutes: currentP.avgMinutes, trends: literalTrends
        },
        chartData: finalChartData,
        dailyChartData
      };
    } catch (err) {
      console.error('Error processing dashboard data:', err);
      return null;
    }
  }, [statsSurat, timeRange]);

  const avgBarValue = useMemo(() => {
    if (!processedData) return 0;
    const realData = processedData.chartData.filter(d => d.name && d.name !== '');
    if (realData.length === 0) return 0;
    const sum = realData.reduce((acc, curr) => acc + curr.val, 0);
    return sum / realData.length;
  }, [processedData]);

  if (loadingContext && !processedData) {
    return (
      <div className="p-6 lg:p-10 space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-4 w-48 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="h-12 w-48 bg-gray-200 rounded-2xl"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[63%] flex flex-col gap-6">
            <div className="h-[360px] bg-gray-200/60 rounded-[32px]"></div>
            <div className="h-[280px] bg-gray-200/60 rounded-[32px]"></div>
          </div>
          <div className="w-full lg:w-[37%] flex flex-col gap-6">
            <div className="h-[240px] bg-gray-200/60 rounded-[32px]"></div>
            <div className="h-[400px] bg-gray-200/60 rounded-[32px]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 lg:pb-0 max-w-[1400px] w-full mx-auto font-sans h-full">

      {/* GRID KESELURUHAN SESUAI GAMBAR */}
      <div className="flex flex-col lg:flex-row gap-[18px]">

        {/* ===================== KOLOM KIRI ===================== */}
        <div className="w-full lg:w-[63%] flex flex-col gap-[18px]">

          {/* 1. Analytics Card */}
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-6 lg:p-8 pb-4 w-full flex flex-col h-[360px] border border-white/60">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[19px] font-bold text-[#1F2937] flex items-center">
                Analisis Pengajuan
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider hidden md:inline">Jangka Waktu</span>
                <div className="relative group">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                    className="bg-[#2E7E62] text-white text-[13px] font-bold pl-5 pr-11 py-2.5 rounded-2xl outline-none cursor-pointer appearance-none shadow-md shadow-emerald-900/10 hover:bg-[#256a52] transition-all duration-300"
                  >
                    <option value={1}>1 Bulan</option>
                    <option value={3}>3 Bulan</option>
                    <option value={6}>6 Bulan</option>
                    <option value={12}>12 Bulan</option>
                  </select>
                  <svg className="w-4 h-4 text-white absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-40%]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[260px]">
              <ResponsiveContainer key={timeRange} width="100%" height="100%" minHeight={260}>
                <BarChart 
                  data={processedData?.chartData || []} 
                  margin={{ top: 15, right: -20, left: -20, bottom: 25 }} 
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} />
                  <ReferenceLine 
                    y={avgBarValue} 
                    stroke="#F59E0B" 
                    strokeDasharray="6 4" 
                    strokeWidth={2} 
                    className="cursor-pointer"
                    onMouseEnter={() => setShowAvgLabel(true)}
                    onMouseLeave={() => setShowAvgLabel(false)}
                    onClick={() => setShowAvgLabel(!showAvgLabel)}
                    label={showAvgLabel ? { 
                      value: `Rata-rata: ${Math.round(avgBarValue)}`, 
                      position: 'top', 
                      fill: '#FF7F50', 
                      fontSize: 11, 
                      fontWeight: 800,
                      offset: 10
                    } : undefined} 
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                    interval={0}
                    padding={{ left: 40, right: 40 }}
                    tickFormatter={(val, index) => {
                      const data = processedData?.chartData[index];
                      if (!data || data.name === '' || data.name === 'tomorrow' || data.isSpacer) return '';
                      
                      // Check if data is from the 1-month daily view (has 'date' attached)
                      if (data.date !== undefined) {
                         const todayIndex = processedData?.chartData.findIndex(d => d.isToday);
                         if (index === todayIndex) return val;
                         if (todayIndex > 0 && index < todayIndex && (todayIndex - index) % 5 === 0) return val;
                         return '';
                      }
                      
                      // For month view, just return the month name (spacers are already filtered by data.name === '')
                      return data.name || '';
                    }}
                  />
                  <YAxis hide width={0} />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFB', radius: 8 }} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.isSpacer) return null;

                        const displayName = data.tooltipName || label;
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1 min-w-[150px]">
                            <span className="text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{displayName}</span>
                            
                            {data.isGhost ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-[13px] font-bold text-gray-400">Potensi:</span>
                                  <span className="text-[13px] font-black text-orange-400">+{data.prediction}</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-[13px] font-bold text-gray-700">Aktual:</span>
                                  <span className="text-[13px] font-black text-emerald-600">{data.val}</span>
                                </div>
                                {data.isToday && data.prediction > 0 && (
                                  <div className="flex justify-between items-center gap-4 pt-1 border-t border-gray-50 mt-1">
                                    <span className="text-[13px] font-bold text-gray-400">Potensi:</span>
                                    <span className="text-[13px] font-black text-orange-400">+{data.prediction}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                   <Bar dataKey="val" stackId="a" radius={[2, 2, 2, 2]} maxBarSize={32}>
                    {processedData?.chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Bar>
                  <Bar dataKey="prediction" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {processedData?.chartData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-pred-${index}`} 
                        fill={entry.fill} 
                        fillOpacity={entry.isGhost ? 1 : (entry.isToday ? 0.25 : 0.4)} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Status Pengajuan (Visitors) */}
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8 w-full pb-6 border border-white/60">
            <h3 className="text-[19px] font-bold text-[#1F2937] mb-8 flex items-center">
              Status Pengajuan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12 px-2">
              {/* Row 1 Left */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[24px] font-bold tracking-tight text-[#2E7E62]"><CountUp value={processedData?.stats.selesai || 0} formatter={(v) => v > 1000 ? (v / 1000).toFixed(1) + 'K' : v.toString()} /></span>
                  <span className="text-[12px] font-semibold text-gray-500">Pengajuan Selesai</span>
                </div>
                <div className="h-10 w-24 min-h-[40px] min-w-[96px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={40} minWidth={96}>
                    <LineChart data={processedData?.stats.selesaiChart}><Line type="linear" dataKey="v" stroke={processedData?.stats.trends.selesaiUp ? "#23C16B" : "#F87171"} strokeWidth={2.5} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 1 Right */}
              <div className="flex items-center justify-between md:pl-6">
                <div className="flex flex-col">
                  <span className="text-[24px] font-bold tracking-tight text-[#2E7E62]"><CountUp value={processedData?.stats.completionRate || 0} suffix="%" /></span>
                  <span className="text-[12px] font-semibold text-gray-500">Tingkat Penyelesaian</span>
                </div>
                <span className={`${processedData?.stats.trends.completionUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} px-3.5 py-1.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-sm uppercase`}>
                  {processedData?.stats.trends.completionUp ? 'UP' : 'DOWN'} 
                  <svg className={`w-3 h-3 ${processedData?.stats.trends.completionUp ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                </span>
              </div>

              {/* Row 2 Left */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[24px] font-bold tracking-tight text-[#2E7E62]"><CountUp value={processedData?.stats.total || 0} formatter={(v) => v > 1000 ? (v / 1000).toFixed(1) + 'K' : v.toString()} /></span>
                  <span className="text-[12px] font-semibold text-gray-500">Total Pengajuan</span>
                </div>
                <div className="h-10 w-24 min-h-[40px] min-w-[96px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={40} minWidth={96}>
                    <LineChart data={processedData?.stats.totalChart}><Line type="linear" dataKey="v" stroke={processedData?.stats.trends.totalUp ? "#3B82F6" : "#DC2626"} strokeWidth={2.5} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 2 Right */}
              <div className="flex items-center justify-between md:pl-6">
                <div className="flex flex-col">
                  <span className="text-[24px] font-bold tracking-tight text-[#2E7E62] h-8">
                    <CountUp 
                      value={processedData?.stats.avgMinutes || 0} 
                      formatter={(v) => v >= 60 ? `${Math.floor(v/60)}j ${v%60}m` : `${v}m`} 
                    />
                  </span>
                  <span className="text-[12px] font-semibold text-gray-500">Rata-rata Waktu</span>
                </div>
                <span className={`${processedData?.stats.trends.avgTimeUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} px-2.5 py-1.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-sm uppercase`}>
                  {processedData?.stats.trends.avgTimeUp ? 'UP' : 'DOWN'} 
                  <svg className={`w-3 h-3 ${processedData?.stats.trends.avgTimeUp ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Demografi Pemohon */}
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8 w-full relative overflow-hidden border border-white/60">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
              <h3 className="text-[19px] font-bold text-[#1F2937] flex items-center">
                Demografi Pemohon
              </h3>
              <div className="flex p-1.5 bg-gray-100/50 rounded-2xl border border-gray-100 self-end sm:self-auto">
                <button
                  onClick={() => setDemografiFilter('diri_sendiri')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${demografiFilter === 'diri_sendiri' ? 'bg-white text-[#2E7E62] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Diri Sendiri
                </button>
                <button
                  onClick={() => setDemografiFilter('diwakili')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${demografiFilter === 'diwakili' ? 'bg-white text-[#2E7E62] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Diwakili
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <RingProgress
                percentage={demografiFilter === 'diri_sendiri' ? (processedData?.stats.total && processedData.stats.total > 0 ? Math.round((processedData.stats.totalSelf / processedData.stats.total) * 100) : 0) : (processedData?.stats.total && processedData.stats.total > 0 ? Math.round((processedData.stats.totalRepresented / processedData.stats.total) * 100) : 0)}
                count={demografiFilter === 'diri_sendiri' ? (processedData?.stats.totalSelf || 0) : (processedData?.stats.totalRepresented || 0)}
                label="Total Pemohon"
                color="#F5B041" // Orange
              />
              <RingProgress
                percentage={demografiFilter === 'diri_sendiri' ? (processedData?.stats.totalSelf && processedData.stats.totalSelf > 0 ? Math.round((processedData.stats.male / processedData.stats.totalSelf) * 100) : 0) : (processedData?.stats.totalRepresented && processedData.stats.totalRepresented > 0 ? Math.round((processedData.stats.maleRepresented / processedData.stats.totalRepresented) * 100) : 0)}
                count={demografiFilter === 'diri_sendiri' ? (processedData?.stats.male || 0) : (processedData?.stats.maleRepresented || 0)}
                label="Laki-laki"
                color="#2563EB" // Consistent Blue
              />
              <RingProgress
                percentage={demografiFilter === 'diri_sendiri' ? (processedData?.stats.totalSelf && processedData.stats.totalSelf > 0 ? Math.round((processedData.stats.female / processedData.stats.totalSelf) * 100) : 0) : (processedData?.stats.totalRepresented && processedData.stats.totalRepresented > 0 ? Math.round((processedData.stats.femaleRepresented / processedData.stats.totalRepresented) * 100) : 0)}
                count={demografiFilter === 'diri_sendiri' ? (processedData?.stats.female || 0) : (processedData?.stats.femaleRepresented || 0)}
                label="Perempuan"
                color="#DB2777" // Consistent Pink
              />
            </div>
          </div>

        </div>

        {/* ===================== KOLOM KANAN ===================== */}
        <div className="flex-1 w-full lg:w-[37%] flex flex-col gap-[18px]">

          {/* Detail Pengajuan Harian */}
          <div className="flex flex-col gap-3">
            <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-8 pb-8 shadow-[0_20px_50px_-15px_rgba(34,197,94,0.1)] border border-emerald-100/50 flex flex-col items-center relative z-10">
              <div className="absolute -inset-4 bg-[#23C16B]/10 blur-[80px] -z-10 rounded-full"></div>
              <div className="w-full mb-6 flex justify-between items-center">
                <h3 className="text-[19px] font-bold text-[#1F2937] flex items-center">
                  24 Jam Terakhir
                </h3>
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-[24px] w-full p-6 py-8 shadow-sm border border-white/80">
                <div className="flex items-center justify-around w-full">
                  <div className="flex flex-col items-center">
                    <span className="text-[24px] font-bold text-[#2E7E62]"><CountUp value={processedData?.stats.masuk24h || 0} /></span>
                    <span className="text-[12px] font-semibold text-gray-600 mt-1 text-center leading-tight">Pengajuan<br className="hidden sm:block" />Baru</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[24px] font-bold text-gray-700"><CountUp value={processedData?.stats.selesai24h || 0} formatter={(v) => v > 1000 ? (v / 1000).toFixed(1) + 'K' : v.toString()} /></span>
                    <span className="text-[12px] font-semibold text-gray-600 mt-1 text-center leading-tight"><br className="hidden sm:block" />Selesai</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[24px] font-bold text-[#2E7E62]"><CountUp value={processedData?.stats.diproses24h || 0} /></span>
                    <span className="text-[12px] font-semibold text-gray-600 mt-1 text-center leading-tight">Sedang<br className="hidden sm:block" />Diproses</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-[120px] mt-6 min-h-[120px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                  <AreaChart
                    data={processedData?.dailyChartData || []}
                    margin={{ top: 5, right: 10, left: 10, bottom: -10 }}
                  >
                    <defs>
                      <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E7E62" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2E7E62" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1F2937" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1F2937" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 8, fill: '#6B7280' }}
                      interval={0}
                      tickFormatter={(val, index) => {
                        const data = processedData?.dailyChartData[index];
                        if (!data) return '';
                        const nowIndex = (processedData?.dailyChartData.length || 0) - 1;
                        // Show current hour and exactly every 4 hours before it
                        if (index === nowIndex) return val;
                        if (nowIndex > 0 && index < nowIndex && (nowIndex - index) % 4 === 0) return val;
                        return '';
                      }}
                      dy={5}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length >= 2) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">{payload[0].payload.time}</span>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#2E7E62]"></div>
                                  <span className="text-[12px] font-semibold text-gray-600">Terima</span>
                                </div>
                                <span className="text-[14px] font-black text-[#2E7E62]">{payload[1].value}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#1F2937]"></div>
                                  <span className="text-[12px] font-semibold text-gray-600">Selesai</span>
                                </div>
                                <span className="text-[14px] font-black text-[#1F2937]">{payload[0].value}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="selesai"
                      stroke="#1F2937"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSelesai)"
                      isAnimationActive={true}
                      activeDot={{ r: 4, fill: '#1F2937', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="masuk"
                      stroke="#2E7E62"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorMasuk)"
                      isAnimationActive={true}
                      activeDot={{ r: 4, fill: '#2E7E62', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pengajuan Baru */}
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8 px-9 flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden border border-white/60">
            <h3 className="text-[19px] font-bold text-[#1F2937] mb-8 flex items-center">
              Pengajuan Baru
            </h3>

            <div className="flex-1 overflow-hidden relative min-h-0">
              <div className="flex flex-col gap-6 pt-2">
                {processedData?.stats.recent.map((s, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#b6dfcc] group-hover:bg-[#2E7E62] shrink-0 mt-1.5 transition-colors"></div>
                    <div className="flex flex-col min-w-0 w-full gap-0.5">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[15px] font-bold text-gray-900 truncate">#{s.no_pengajuan || s.id.split('-')[0].toUpperCase()}</span>
                        <span className="text-[12px] font-medium text-gray-400 whitespace-nowrap">{format(new Date(s.created_at), 'dd MMM HH:mm', { locale: id })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-gray-500">{s.jenis_surat}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600' :
                            s.status === 'Diproses' ? 'bg-blue-50 text-blue-600' :
                              s.status === 'Ditolak' ? 'bg-gray-50 text-gray-700 border border-gray-100' :
                                'bg-amber-50 text-amber-600'
                          }`}>{s.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!(processedData?.stats.recent.length) && <div className="text-gray-400 text-sm italic">Belum ada pengajuan masuk.</div>}
              </div>
              {/* Fade Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
            </div>

            <Link href="/adm/pengajuan" className="w-full mt-8 py-4 bg-gray-100/80 backdrop-blur-md rounded-2xl text-[13px] font-black text-gray-700 uppercase hover:bg-[#23C16B] hover:text-white transition-all duration-300 flex items-center justify-center tracking-widest">
              Lihat Semua Data
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

// Donut Chart Simple 
function RingProgress({ percentage, count, label, color }: { percentage: number, count: number, label: string, color: string }) {
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1000; // matching CSS ring transition (1s)
    const startVal = displayPercent;
    const endVal = percentage;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Cubic-out easing for premium feel
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentVal = Math.round(startVal + (endVal - startVal) * easedProgress);
      setDisplayPercent(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [percentage]);

  const r = 38;
  const strokeW = 8;
  const c = r * 2 * Math.PI;
  const offset = c - (displayPercent / 100) * c;

  return (
    <div className="flex items-center gap-3 justify-center md:justify-start group">
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        <svg height="96" width="96" className="absolute -rotate-90">
          <circle stroke="#F1F5F9" fill="transparent" strokeWidth={strokeW} r={r} cx="48" cy="48" strokeLinecap="round" />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeW}
            strokeDasharray={`${c} ${c}`}
            style={{ strokeDashoffset: offset }}
            strokeLinecap="round"
            r={r}
            cx="48"
            cy="48"
            className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(0,0,0,0.05)]"
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-[18px] font-bold tracking-tighter" style={{ color }}>{displayPercent}%</span>
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-gray-500 mb-1">{label}</p>
        <p className="text-[26px] font-bold text-[#1F2937] leading-none">
          <CountUp value={count} />
        </p>
      </div>
    </div>
  );
}

// Reusable CountUp Component
function CountUp({ value, suffix = '', formatter }: { value: number, suffix?: string, formatter?: (v: number) => string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1000;
    const startVal = displayValue;
    const endVal = value;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easedProgress);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{formatter ? formatter(displayValue) : displayValue}{suffix}</>;
}
