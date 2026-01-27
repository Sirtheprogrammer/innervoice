import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdLogout, MdMenu, MdPeople, MdComment, MdMessage, MdRefresh, MdPayments } from 'react-icons/md';
import AdminSidebar from '../components/AdminSidebar';
import userService from '../services/userService';
import confessionsService from '../services/confessionsService';
import commentsService from '../services/commentsService';
import '../styles/AdminPanel.css';
import { getAllPendingPayouts, approvePayout, rejectPayout } from '../services/payoutService';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    users: 0,
    confessions: 0,
    comments: 0
  });

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPayouts();
  }, []);

  const fetchStats = async () => {
    try {
      const [userCount, confessionCount, commentCount] = await Promise.all([
        userService.getUserCount(),
        confessionsService.getConfessionCount(),
        commentsService.getCommentCount()
      ]);
      setStats({
        users: userCount,
        confessions: confessionCount,
        comments: commentCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { users } = await userService.getAllUsers(20);
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Payouts state
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const fetchPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const data = await getAllPendingPayouts();
      setPayouts(data);
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoadingPayouts(false);
    }
  };

  // Add fetchPayouts to mount effect
  useEffect(() => {
    // fetchStats and fetchUsers already called in original effect.
    // We can just add this here or modify the original one. 
    // Since I can't easily merge two useEffects with replace_file_content unless I replace the whole block...
    // I will let the original run and just add this new effect or better, replace the original effect block.
  }, []); // Placeholder

  const handleApprovePayout = async (id) => {
    if (!window.confirm("Approve this payout?")) return;
    try {
      await approvePayout(id);
      fetchPayouts(); // refresh
      alert("Payout approved");
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleRejectPayout = async (id) => {
    if (!window.confirm("Reject this payout? Funds will be refunded.")) return;
    try {
      await rejectPayout(id);
      fetchPayouts(); // refresh
      alert("Payout rejected and refunded");
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, isBanned) => {
    setUserActionLoading(userId);
    try {
      if (isBanned) {
        await userService.unbanUser(userId);
      } else {
        await userService.banUser(userId);
      }
      // Refresh user list to show updated status
      await fetchUsers();
      // Also refresh stats as banned users might affect active user count logic if we had it
      fetchStats();
    } catch (error) {
      console.error('Error toggling ban status:', error);
      alert('Failed to update user status');
    } finally {
      setUserActionLoading(null);
    }
  };

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="admin-header-content">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="admin-menu-toggle"
            aria-label="Toggle sidebar"
          >
            <MdMenu />
          </button>
          <h1>InnerVoice Admin</h1>
          <div className="admin-user-info">
            <span className="user-email">{user?.email}</span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="admin-logout-btn"
            >
              <MdLogout />
              <span>{loading ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={`admin-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <section className="admin-section">
          <div className="section-header">
            <h2>Dashboard Overview</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { fetchStats(); fetchUsers(); fetchPayouts(); }} className="refresh-btn">
                <MdRefresh /> Refresh
              </button>
              {/* Admin Tool: Fix Mappings */}
              <button
                onClick={async () => {
                  if (!window.confirm("Run referral code migration? This will create public mappings for all current users.")) return;
                  setLoading(true);
                  try {
                    const { users: allUsers } = await userService.getAllUsers(1000); // Fetch all/many
                    let count = 0;
                    const { doc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('../firebase/config');

                    for (const u of allUsers) {
                      if (u.referralCode) {
                        // Normalize
                        const code = u.referralCode.trim().toUpperCase();
                        await setDoc(doc(db, 'referral_codes', code), { userId: u.id });
                        count++;
                      }
                    }
                    alert(`Migration complete. Processed ${count} codes.`);
                  } catch (e) {
                    console.error(e);
                    alert("Migration failed: " + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="refresh-btn"
                style={{ background: '#f59e0b' }}
              >
                Fix Referrals
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon users-icon"><MdPeople /></div>
              <div className="stat-content">
                <h3>Total Users</h3>
                <p>{stats.users}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon confessions-icon"><MdComment /></div>
              <div className="stat-content">
                <h3>Confessions</h3>
                <p>{stats.confessions}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon comments-icon"><MdMessage /></div>
              <div className="stat-content">
                <h3>Comments</h3>
                <p>{stats.comments}</p>
              </div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="stat-icon" style={{ color: '#f59e0b', background: '#fffbeb' }}><MdPayments /></div>
              <div className="stat-content">
                <h3>Pending Payouts</h3>
                <p>{payouts.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h2>Payout Requests</h2>
          <div className="admin-table-container">
            {loadingPayouts ? (
              <div className="admin-loading">Loading payouts...</div>
            ) : payouts.length === 0 ? (
              <div className="admin-empty">No pending payouts.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id}>
                      <td>{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'Now'}</td>
                      <td className="monospace">{p.userId.substring(0, 8)}...</td>
                      <td>{p.fullName}</td>
                      <td>{p.phoneNumber}</td>
                      <td style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(p.amount).toLocaleString()} TZS</td>
                      <td>
                        <button onClick={() => handleApprovePayout(p.id)} style={{ padding: '6px 12px', marginRight: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Approve
                        </button>
                        <button onClick={() => handleRejectPayout(p.id)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="admin-section">
          <h2>User Management</h2>
          <div className="admin-table-container">
            {loadingUsers ? (
              <div className="admin-loading">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="admin-empty">No users found.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="monospace">{user.id.substring(0, 8)}...</td>
                      <td>{user.email || 'Anonymous'}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${user.banned ? 'banned' : 'active'}`}>
                          {user.banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`action-btn ${user.banned ? 'unban-btn' : 'ban-btn'}`}
                          onClick={() => handleBanUser(user.id, user.banned)}
                          disabled={userActionLoading === user.id}
                        >
                          {userActionLoading === user.id ? '...' : (user.banned ? 'Unban' : 'Ban')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
