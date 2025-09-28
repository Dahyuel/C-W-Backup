
import React, { useState } from "react";
import { Users } from "lucide-react";
import { QrCode, Gift, Building, Megaphone} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { useAuth } from "../../contexts/AuthContext";
import { QRScanner } from "../../components/shared/QRScanner";

export const TeamLeaderDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // QR Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"attendance" | "bonus" | null>(
    null
  );
  const [lastScan, setLastScan] = useState<string | null>(null);

  //announcment
 const [announcementModal, setAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementRole, setAnnouncementRole] = useState("");


  // Bonus workflow state
  const [bonusModal, setBonusModal] = useState(false);
  const [bonusAmount, setBonusAmount] = useState<number>(0);

  const handleScan = (data: string) => {
    setLastScan(data);

    if (scannerMode === "attendance") {
      alert(`✅ Attendance recorded for volunteer: ${data}`);
      // TODO: supabase.from("attendance").insert({ volunteer_id: data })
    }

    if (scannerMode === "bonus" && bonusAmount > 0) {
      alert(`🎁 Bonus of ${bonusAmount} assigned to volunteer: ${data}`);
      // TODO: supabase.from("bonuses").insert({ volunteer_id: data, amount: bonusAmount })
    }

    setScannerOpen(false);
    setScannerMode(null);
  };

  return (
    <DashboardLayout
      title="Team Leader Dashboard"
      subtitle="Manage your team, assign tasks, and monitor performance"
    >
      <div className="space-y-8">
{/* Quick Actions */}
<div className="bg-white rounded-xl shadow-sm border border-black p-6">
 <div className="flex justify-center">
  <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2 mb-8">
    <Users className="h-8 w-8 text-orange-500" />
    Manage Your Team
  </h2>
</div>


<div className="flex flex-col md:flex-row gap-4 justify-center">
  
  {/* Attendance */}
  <button
    onClick={() => {
      setScannerMode("attendance");
      setScannerOpen(true);
    }}
    className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-700 transition-colors"
  >
    <QrCode className="h-8 w-8 mb-2" />
    <span className="text-base font-medium">Scan Attendance</span>
  </button>

  {/* Bonus */}
  <button
    onClick={() => setBonusModal(true)}
    className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-green-500 text-white rounded-xl hover:bg-green-800 transition-colors"
  >
    <Gift className="h-8 w-8 mb-2" />
    <span className="text-base font-medium">Assign Bonus</span>
  </button>

  {/* Announcements */}
  <button
    onClick={() => setAnnouncementModal(true)}
    className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-700 transition-colors"
  >
    <Megaphone className="h-8 w-8 mb-2" />
    <span className="text-base font-medium">Send Announcement</span>
  </button>
</div>


        </div>

{/* Flow Dashboard Widget */}
<div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
    <h2 className="text-3xl font-bold text-black-800 flex items-center gap-2 mx-auto">
      <Building className="h-7 w-7 text-orange-500" />
      Flow Dashboard
    </h2>
  </div>

  {/* Stats Overview */}
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
      <p className="text-lg font-bold text-gray-700">Total Attendees Today</p>
    </div>
  </div>

  {/* Content */}
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


        {/* Last Scan Info */}
        {lastScan && (
          <div className="p-4 bg-gray-100 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-800">
              ✅ Last scanned volunteer: <b>{lastScan}</b>
            </p>
            {bonusAmount > 0 && scannerMode === "bonus" && (
              <p className="text-sm text-green-600">
                🎁 Bonus Assigned: <b>{bonusAmount}</b>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bonus Input Modal */}
      {bonusModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96 relative">
            {/* Close Button */}
            <button
              onClick={() => setBonusModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            {/* Title */}
            <h2 className="text-lg font-semibold text-black mb-4 text-center">
              Assign Bonus
            </h2>

            {/* Input */}
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={bonusAmount === 0 ? "" : bonusAmount}
              onChange={(e) => setBonusAmount(Number(e.target.value))}
              placeholder="Enter bonus amount (1 - 50)"
              className={`w-full border rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 
                ${
                  bonusAmount < 1 || bonusAmount > 50
                    ? "border-red-500"
                    : "border-gray-300"
                }
              `}
            />

            {/* Validation */}
            {bonusAmount < 1 && bonusAmount !== 0 && (
              <p className="text-sm text-red-600 mb-2">
                Bonus must be at least 1 point.
              </p>
            )}
            {bonusAmount > 50 && (
              <p className="text-sm text-red-600 mb-2">
                Bonus cannot exceed 50 points.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setBonusModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                disabled={bonusAmount < 1 || bonusAmount > 50}
                onClick={() => {
                  setBonusModal(false);
                  setScannerMode("bonus");
                  setScannerOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                Continue to Scan
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
                  alert(
                    `📢 Announcement Sent!\n\nTitle: ${announcementTitle}\nDescription: ${announcementDescription}\nRole: ${announcementRole}`
                  );
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


      {/* QR Scanner Modal */}
      <QRScanner
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        isOpen={scannerOpen}
        title={scannerMode === "attendance" ? "Scan Attendance" : "Scan Bonus"}
        description={
          scannerMode === "attendance"
            ? "Scan the volunteer QR to mark attendance"
            : `Scan the volunteer QR to assign bonus of ${bonusAmount}`
        }
      />
    </DashboardLayout>
  );
};




