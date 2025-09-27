

"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  Building,
  Calendar,
  Megaphone,
  XCircle,
  CheckCircle2,
 Sparkles,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";

const fakeStats = {
  total_users: 120,
  total_sessions: 35,
};

export  function AdminPanel() {
  const [stats] = useState(fakeStats);

  // Modals
  const [companyModal, setCompanyModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
 
    //announcment
   const [announcementModal, setAnnouncementModal] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementDescription, setAnnouncementDescription] = useState("");
    const [announcementRole, setAnnouncementRole] = useState("");
  
  

  // Notification
  const [announcement, setAnnouncement] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({ message: "", type: null });

  const showNotification = (message: string, type: "success" | "error") => {
    setAnnouncement({ message, type });
    setTimeout(() => {
      setAnnouncement({ message: "", type: null });
    }, 4000);
  };

  // Add Company state
  const [newCompany, setNewCompany] = useState({
    name: "",
    logo: null as File | null,
    description: "",
    website: "",
    boothNumber: "",
  });

  const handleCompanySubmit = async () => {
    if (!newCompany.name || !newCompany.website || !newCompany.boothNumber) {
      showNotification(" Please fill all required fields!", "error");
      return;
    }

    try {
      // Simulate success
      setCompanyModal(false);
      setNewCompany({
        name: "",
        logo: null,
        description: "",
        website: "",
        boothNumber: "",
      });
      showNotification(" Company added successfully!", "success");
    } catch (err) {
      showNotification("Failed to add company", "error");
    }
  };

  // Add Session state
  const [newSession, setNewSession] = useState({
    title: "",
  date: "",
  speaker: "",
  capacity: "",
  type: "",
  hour: "",
  location: "",
  });

  const handleSessionSubmit = async () => {
    if (!newSession.title || !newSession.date || !newSession.speaker) {
      showNotification(" Please fill all required fields!", "error");
      return;
    }

    try {
      // Simulate success
      setSessionModal(false);
      setNewSession({ title: "", date: "", speaker: "", capacity:"", type: "", hour: "", location:"" });
      showNotification(" Session added successfully!", "success");
    } catch (err) {
      showNotification(" Failed to add session", "error");
    }
  };

  return (
    <DashboardLayout
      title="Admin Panel"
      subtitle="System administration, user management, and analytics"
    >
      <div className="space-y-8">
        {/* Notification */}
        {/* Notification */}
{announcement.type && (
  <div
    className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 p-4 rounded-lg shadow-lg text-white ${
      announcement.type === "success" ? "bg-green-600" : "bg-red-600"
    }`}
  >
    {announcement.type === "success" ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : (
      <XCircle className="h-5 w-5" />
    )}
    <span>{announcement.message}</span>
  </div>
)}


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.total_users || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Sessions
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.total_sessions || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 text-center">
  <h1 className="text-3xl font-bold text-black-800 flex items-center justify-center gap-2 mb-6">
    <Sparkles className="h-7 w-7 text-orange-500" />
    Quick Actions
  </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setCompanyModal(true)}
              className="flex flex-col items-center justify-center py-6 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Building className="h-8 w-8 mb-2" />
              <span className="text-base font-medium">Add Company</span>
            </button>

            <button
              onClick={() => setSessionModal(true)}
              className="flex flex-col items-center justify-center py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Calendar className="h-8 w-8 mb-2" />
              <span className="text-base font-medium">Add Session</span>
            </button>

            <button
              onClick={() => setAnnouncementModal(true)}
              className="flex flex-col items-center justify-center py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              <Megaphone className="h-8 w-8 mb-2" />
              <span className="text-base font-medium">Send Announcement</span>
            </button>
          </div>
        </div>

        {/* Flow Dashboard Widget */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-3xl font-bold text-black-800 flex items-center gap-2 mx-auto">
              <Building className="h-7 w-7 text-orange-500" />
              Flow Dashboard
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 px-6 py-6 text-center">
            <div className="bg-green-100 p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-green-900">12</p>
              <p className="text-lg font-bold text-gray-700">Inside Building</p>
            </div>
            <div className="bg-teal-100 p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-teal-900">5</p>
              <p className="text-lg font-bold text-gray-700">Inside Event</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-blue-900">3</p>
              <p className="text-lg font-bold text-gray-700">
                Total Attendees Today
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-lg font-bold text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-800 text-xl font-extrabold">
                  <tr>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Maximum Capacity</th>
                    <th className="px-4 py-3">Current Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-3">Building</td>
                    <td className="px-4 py-3 text-red-600">500</td>
                    <td className="px-4 py-3">80%</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-3">Event</td>
                    <td className="px-4 py-3 text-red-600">4000</td>
                    <td className="px-4 py-3">40%</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-red-600">4500</td>
                    <td className="px-4 py-3">15%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
      {companyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-2xl font-bold mb-4">Add New Company</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, name: e.target.value })
                }
                className="w-full border rounded-lg p-2"
                placeholder="Company Name *"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewCompany({
                    ...newCompany,
                    logo: e.target.files?.[0] || null,
                  })
                }
                className="w-full border rounded-lg p-2"
              />
              <textarea
                value={newCompany.description}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, description: e.target.value })
                }
                className="w-full border rounded-lg p-2"
                placeholder="Description"
                rows={3}
              />
              <input
                type="url"
                value={newCompany.website}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, website: e.target.value })
                }
                className="w-full border rounded-lg p-2"
                placeholder="Website *"
              />
              <input
                type="text"
                value={newCompany.boothNumber}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, boothNumber: e.target.value })
                }
                className="w-full border rounded-lg p-2"
                placeholder="Booth Number *"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setCompanyModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCompanySubmit}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Save Company
              </button>
            </div>
          </div>
        </div>
      )}
{/* Add Session Modal */}
{sessionModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <h3 className="text-2xl font-bold mb-4">Add Session</h3>
      <div className="space-y-4">
        {/* Session Title */}
        <input
          type="text"
          value={newSession.title}
          onChange={(e) =>
            setNewSession({ ...newSession, title: e.target.value })
          }
          className="w-full border rounded-lg p-2"
          placeholder="Session Title *"
        />

        
        {/* Session Type */}
        <input
          type="text"
          value={newSession.type || ""}
          onChange={(e) =>
            setNewSession({ ...newSession, type: e.target.value })
          }
          className="w-full border rounded-lg p-2"
          placeholder="Session Type *"
        />

        
        {/* Session Hour */}
        <input
          type="time"
          value={newSession.hour || ""}
          onChange={(e) =>
            setNewSession({ ...newSession, hour: e.target.value })
          }
          className="w-full border rounded-lg p-2"
          placeholder="Session Hour *"
        />

        {/* Date with dd/mm/yyyy placeholder hack */}
        <div className="relative">
          <input
            type="date"
            value={newSession.date}
            onChange={(e) =>
              setNewSession({ ...newSession, date: e.target.value })
            }
            className="w-full border rounded-lg p-2 text-gray-900"
          />
          {!newSession.date && (
            <span className="absolute left-3 top-2 text-gray-400 pointer-events-none">
           
            </span>
          )}
        </div>

        {/* Speaker */}
        <input
          type="text"
          value={newSession.speaker}
          onChange={(e) =>
            setNewSession({ ...newSession, speaker: e.target.value })
          }
          className="w-full border rounded-lg p-2"
          placeholder="Speaker *"
        />

        {/* Capacity */}
        <input
          type="number"
          value={newSession.capacity || ""}
          onChange={(e) =>
            setNewSession({ ...newSession, capacity: e.target.value })
          }
          className="w-full border rounded-lg p-2"
          placeholder="Capacity *"
        />


        {/* Session Location */}
        <input
          type="text"
          value={newSession.location || ""}
          onChange={(e) =>
            setNewSession({ ...newSession, location: e.target.value })
          }
          className="w-full border rounded-lg p-2"
          placeholder="Session Location *"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={() => setSessionModal(false)}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSessionSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Session
        </button>
      </div>
    </div>
  </div>
)}


      
     {/* ✅ Announcement Modal */}
      {announcementModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96 relative">
            {/* Close Button */}
            <button
              onClick={() => setAnnouncementModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold text-black mb-4 text-center">
              Send Announcement
            </h2>

            {/* Title */}
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="Message Title"
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />

            {/* Description */}
            <textarea
              value={announcementDescription}
              onChange={(e) => setAnnouncementDescription(e.target.value)}
              placeholder="Message Description"
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
            />

            {/* Role */}
            <select
              value={announcementRole}
              onChange={(e) => setAnnouncementRole(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
             <option value="select_role">Select Role</option>
              <option value="volunteer">Volunteer</option>
              <option value="team_leader">Team Leader</option>
              <option value="admin">Admin</option>
            </select>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAnnouncementModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
             <button
  onClick={() => {
    if (!announcementTitle || !announcementDescription || !announcementRole) {
      showNotification(" Please fill all required fields!", "error");
      return;
    }

    showNotification(" Announcement sent successfully!", "success");

    // reset form & close modal
    setAnnouncementTitle("");
    setAnnouncementDescription("");
    setAnnouncementRole("");
    setAnnouncementModal(false);
  }}
  className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
>
  Send
</button>

            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}



