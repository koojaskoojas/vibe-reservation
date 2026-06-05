import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../api';

const statusConfig = {
  예약됨: { color: 'bg-blue-100 text-blue-700', label: '예약됨' },
  완료: { color: 'bg-green-100 text-green-700', label: '완료' },
  취소: { color: 'bg-gray-100 text-gray-600', label: '취소' },
  노쇼: { color: 'bg-red-100 text-red-700', label: '노쇼' },
};

function StatCard({ title, value, icon, color, subText }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value ?? '-'}</p>
        {subText && <p className="text-xs text-gray-400 mt-0.5">{subText}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, todayData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getToday(),
      ]);
      setStats(statsData);
      setTodayAppts(todayData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-blue-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-600">데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-500 text-center">
          <p className="font-medium">데이터 로드 실패</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <button onClick={fetchData} className="btn-primary text-sm">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="오늘 예약"
          value={stats?.today_appointments}
          color="bg-blue-100"
          subText="취소 제외"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="전체 환자"
          value={stats?.total_patients}
          color="bg-green-100"
          subText="등록된 환자 수"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="전체 의사"
          value={stats?.total_doctors}
          color="bg-purple-100"
          subText="소속 의료진 수"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
        <StatCard
          title="이번 달 예약"
          value={stats?.monthly_appointments}
          color="bg-orange-100"
          subText="취소 제외"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* 오늘 예약 목록 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">오늘의 예약</h2>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          </span>
        </div>

        {todayAppts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-medium">오늘 예약이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th rounded-tl-lg">시간</th>
                  <th className="table-th">환자명</th>
                  <th className="table-th">담당의</th>
                  <th className="table-th">진료과</th>
                  <th className="table-th">진료 사유</th>
                  <th className="table-th rounded-tr-lg">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayAppts.map((appt) => {
                  const sc = statusConfig[appt.status] || statusConfig['예약됨'];
                  return (
                    <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td font-medium text-blue-600">{appt.appointment_time}</td>
                      <td className="table-td font-medium">{appt.patient_name}</td>
                      <td className="table-td">{appt.doctor_name}</td>
                      <td className="table-td text-gray-500">{appt.department_name || '-'}</td>
                      <td className="table-td text-gray-500">{appt.reason || '-'}</td>
                      <td className="table-td">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
