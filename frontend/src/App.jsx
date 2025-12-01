import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Menu, X, ArrowRight, Smartphone, Zap, BarChart3,
  ShieldCheck, Play, Star, Wrench, ChevronDown, Mail, ArrowLeft,
  LayoutDashboard, Box, Calendar, Settings, Bell, Plus, Search,
  Filter, MoreHorizontal, Lock, Server
} from 'lucide-react';

// --- 0. Global Styles & Effects ---
const GlobalStyles = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    .btn-shimmer {
      background: linear-gradient(115deg, #2563eb 40%, #60a5fa 50%, #2563eb 60%);
      background-size: 200% auto;
      animation: shimmer 3s linear infinite;
      color: white;
    }
    .btn-shimmer:hover {
      animation: none;
      background: #1d4ed8;
    }
    html { scroll-behavior: smooth; }
  `}</style>
);

const SEOAndSchema = () => {
  useEffect(() => {
    document.title = "FixTime AI - #1 简单的维护管理软件";
  }, []);

  return null;
};

// --- Main App Component ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [dashboardTab, setDashboardTab] = useState('overview');

  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Simple homepage
  const HomePage = () => (
    <div className="min-h-screen bg-slate-950 text-white">
      <GlobalStyles />
      <SEOAndSchema />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            FixTime AI - 简单的维护管理软件
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            专为小企业设计的预防性维护管理系统
          </p>
          <button
            onClick={() => navigate('dashboard')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg btn-shimmer"
          >
            开始使用
          </button>
        </div>
      </section>
    </div>
  );

  // Simple Dashboard
  const Dashboard = () => (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
          <span className="font-bold text-lg">FixTime AI</span>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setDashboardTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              dashboardTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>概览</span>
          </button>

          <button
            onClick={() => setDashboardTab('assets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              dashboardTab === 'assets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Box size={20} />
            <span>资产</span>
          </button>

          <button
            onClick={() => setDashboardTab('workorders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              dashboardTab === 'workorders' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Wrench size={20} />
            <span>工单</span>
          </button>
        </nav>

        <button
          onClick={() => navigate('home')}
          className="mt-auto w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>退出</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">
          {dashboardTab === 'overview' && '仪表板概览'}
          {dashboardTab === 'assets' && '资产管理'}
          {dashboardTab === 'workorders' && '工单管理'}
        </h2>

        <div className="bg-slate-900 rounded-xl p-8 text-center">
          <p className="text-slate-400">
            {dashboardTab === 'overview' && '欢迎使用 FixTime AI！'}
            {dashboardTab === 'assets' && '添加您的第一个资产开始管理'}
            {dashboardTab === 'workorders' && '创建您的第一个维护工单'}
          </p>
          <button className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg">
            {dashboardTab === 'assets' && '添加资产'}
            {dashboardTab === 'workorders' && '创建工单'}
            {dashboardTab === 'overview' && '查看教程'}
          </button>
        </div>
      </main>
    </div>
  );

  // Render based on current page
  if (currentPage === 'dashboard') {
    return <Dashboard />;
  }

  return <HomePage />;
}