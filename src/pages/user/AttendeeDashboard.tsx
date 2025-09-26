import React, { useState, useEffect } from "react";
import { Trophy, Star, QrCode, Calendar, MapPin, Clock, Building } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Types
interface UserScore {
  score: number;
  rank: number;
  total_users: number;
}

interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  type: string;
}

const AttendeeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    try {
      // Score
      const { data: scoreData } = await supabase
        .from("user_scores")
        .select("score")
        .eq("user_id", profile.id)
        .single();

      if (scoreData) {
        const { data: rankData } = await supabase.rpc("get_user_ranking", {
          user_id: profile.id,
        });

        setUserScore({
          score: scoreData.score || 0,
          rank: rankData?.rank || 0,
          total_users: rankData?.total_users || 0,
        });
      }

      // Schedule
      const today = new Date().toISOString().split("T")[0];
      const { data: scheduleData } = await supabase
        .from("schedule_items")
        .select("*")
        .gte("start_time", `${today}T00:00:00`)
        .lt("start_time", `${today}T23:59:59`)
        .order("start_time", { ascending: true });

      if (scheduleData) setSchedule(scheduleData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = () => profile?.id || "";

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome back to Career Week">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Day maps path
  const mapImages = [
    "/src/Assets/day1.png",
    "/src/Assets/day2.png",
    "/src/Assets/day3.png",
    "/src/Assets/day4.png",
    "/src/Assets/day5.png",
  ];

  // Employers
  const employers = [
    {
      name: "Google",
      logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
      description: "Leading global technology company offering cloud, software, and AI roles.",
      url: "https://careers.google.com/",
    },
    {
      name: "Microsoft",
      logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      description: "Enterprise software giant with roles in cloud, security, and engineering.",
      url: "https://careers.microsoft.com/",
    },
    {
      name: "Cyshield",
      logo: "https://www.cyshield.com/images/logo.png",
      description: "Cybersecurity solutions provider offering internships and security engineer positions.",
      url: "https://www.cyshield.com/",
    },
  ];

  const handleEmployerClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout title="Attendee Dashboard" subtitle={`Welcome back, ${profile?.first_name}!`}>
      {/* 🔁 Tabs */}
      <div className="flex space-x-4 border-b mb-6">
        {["overview", "events", "maps", "employers"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-semibold ${
              activeTab === tab
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-500 hover:text-orange-600"
            }`}
          >
            {tab === "overview" && "Overview"}
            {tab === "events" && "Event Days"}
            {tab === "maps" && "Maps"}
            {tab === "employers" && "Employers"}
          </button>
        ))}
      </div>

      {/* 📊 Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <p className="text-sm font-medium text-gray-600">Your Score</p>
            <p className="text-3xl font-bold text-orange-600">{userScore?.score || 0}</p>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mt-2">
              <Trophy className="h-6 w-6 text-orange-600" />
            </div>
          </div>

          {/* Rank */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <p className="text-sm font-medium text-gray-600">Your Rank</p>
            <p className="text-3xl font-bold text-blue-600">#{userScore?.rank || 0}</p>
            <p className="text-xs text-gray-500">of {userScore?.total_users || 0} attendees</p>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mt-2">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          {/* QR */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <p className="text-sm font-medium text-gray-600">Your QR Code</p>
            <button
              onClick={() => setShowQR(true)}
              className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
            >
              Show QR
            </button>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mt-2">
              <QrCode className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* 🗓️ Event Days */}
      {activeTab === "events" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-orange-600" /> 5-Day Event Schedule
          </h2>
          <div className="space-y-4">
            {schedule.length > 0 ? (
              schedule.map((item) => (
                <div key={item.id} className="border-l-4 border-orange-500 pl-4 py-2 bg-white rounded-lg shadow-sm">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {item.location}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No schedule available</p>
            )}
          </div>
        </div>
      )}

      {/* 🗺️ Maps */}
      {activeTab === "maps" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Event Maps</h2>
          <div className="flex space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-lg text-sm ${activeDay === day ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                Day {day}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-center">
            <img
              src={mapImages[activeDay - 1]}
              alt={`Day ${activeDay} Map`}
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}

      {/* 🏢 Employers */}
      {activeTab === "employers" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Participating Employers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {employers.map((employer) => (
              <div
                key={employer.name}
                onClick={() => handleEmployerClick(employer.url)} // Redirection to the website
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md cursor-pointer transition"
              >
                <img src={employer.logo} alt={employer.name} className="h-16 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-center mb-2">{employer.name}</h3>
                <p className="text-sm text-gray-600 text-center">{employer.description}</p>
                <div className="flex justify-center mt-4">
                  <Building className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Your QR Code</h3>
            <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">QR Code</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{generateQRCode()}</p>
              </div>
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AttendeeDashboard;
