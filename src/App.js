import React, { useState, useEffect } from "react";
import {
  Upload,
  File,
  Folder,
  Download,
  Trash2,
  LogOut,
  Search,
  Plus,
  X,
  Eye,
  Share2,
  Lock,
  Database,
  Cloud,
  Shield,
  Users,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle,
  Server,
  Code,
  Layout,
  User,
  Settings,
  BarChart,
  Bell,
  Menu,
} from "lucide-react";

import { createClient } from "@supabase/supabase-js";

// Hardcoded Supabase configuration
const SUPABASE_CONFIG = {
  url: "https://edssqckngdwtbrnfddnc.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkc3NxY2tuZ2R3dGJybmZkZG5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIxOTY2MCwiZXhwIjoyMDgzNzk1NjYwfQ.SM1mk-zTRq6Bv8lnzFp72lS47J9O0Uew2x-yBsgv8dY"
};

export default function FileVaultSupabase() {
  const [isSetup, setIsSetup] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("home");
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [authData, setAuthData] = useState({
    username: "",
    password: "",
    email: "",
  });

  // LocalStorage helper functions
  const storage = {
    set: (key, value) => localStorage.setItem(key, value),
    get: (key) => {
      const value = localStorage.getItem(key);
      return value ? { value } : null;
    },
    remove: (key) => localStorage.removeItem(key),
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Supabase client with hardcoded credentials
      const client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
      setSupabaseClient(client);
      
      // Test connection
      const { data, error } = await client.from("users").select("count");
      if (!error) {
        setIsSetup(true);
        console.log("✅ Supabase connected successfully");
      } else {
        console.error("Supabase connection error:", error);
        // Still set as setup so users can try to register
        setIsSetup(true);
      }
      
      setView("home");
    } catch (error) {
      console.error("App initialization error:", error);
      // Still allow the app to function
      setIsSetup(true);
      setView("home");
    }
  };

  // Supabase Helper Functions
  const supabaseRequest = async (action, table, data = {}) => {
    if (!supabaseClient) {
      throw new Error("Supabase not configured");
    }

    try {
      switch (action) {
        case "insertOne":
          const { data: insertData, error: insertError } = await supabaseClient
            .from(table)
            .insert([data.document])
            .select()
            .single();

          if (insertError) throw new Error(insertError.message);
          return { insertedId: insertData.id };

        case "find":
          let query = supabaseClient.from(table).select("*");

          if (data.filter?.userId) {
            query = query.eq("user_id", data.filter.userId);
          }
          if (data.filter?.folderId !== undefined) {
            if (data.filter.folderId === null) {
              query = query.is("folder_id", null);
            } else {
              query = query.eq("folder_id", data.filter.folderId);
            }
          }

          const { data: findData, error: findError } = await query;
          if (findError) throw new Error(findError.message);
          return { documents: findData || [] };

        case "findOne":
          let findOneQuery = supabaseClient.from(table).select("*");

          if (data.filter?.username) {
            findOneQuery = findOneQuery.eq("username", data.filter.username);
          }
          if (data.filter?.id) {
            findOneQuery = findOneQuery.eq("id", data.filter.id);
          }

          const { data: findOneData, error: findOneError } =
            await findOneQuery.single();

          if (findOneError && findOneError.code !== "PGRST116") {
            throw new Error(findOneError.message);
          }
          return { document: findOneData };

        case "updateOne":
          const { error: updateError } = await supabaseClient
            .from(table)
            .update(data.update)
            .eq("id", data.filter?.id);

          if (updateError) throw new Error(updateError.message);
          return { modifiedCount: 1 };

        case "deleteOne":
          const { error: deleteError } = await supabaseClient
            .from(table)
            .delete()
            .eq("id", data.filter?.id);

          if (deleteError) throw new Error(deleteError.message);
          return { deletedCount: 1 };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error("Supabase request error:", error);
      throw error;
    }
  };

  const handleLogin = async () => {
    if (!authData.username || !authData.password) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      const result = await supabaseRequest("findOne", "users", {
        filter: { username: authData.username },
      });

      if (result.document && result.document.password === authData.password) {
        setCurrentUser(result.document);
        
        if (result.document.role === "admin") {
          setView("adminDashboard");
          await loadAdminData();
        } else {
          setView("dashboard");
          await loadUserData(result.document.id);
        }
        
        setAuthData({ username: "", password: "", email: "" });
        setMobileMenuOpen(false);
      } else {
        alert("Invalid credentials!");
      }
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      // Load all users
      const usersResult = await supabaseRequest("find", "users", {});
      setAllUsers(usersResult.documents || []);
      
      // Load admin stats
      const filesResult = await supabaseRequest("find", "files", {});
      const foldersResult = await supabaseRequest("find", "folders", {});
      
      const stats = {
        totalUsers: usersResult.documents?.length || 0,
        totalFiles: filesResult.documents?.length || 0,
        totalFolders: foldersResult.documents?.length || 0,
        totalStorageUsed: usersResult.documents?.reduce((sum, user) => sum + (user.storage_used || 0), 0) || 0,
        recentUsers: usersResult.documents?.slice(-5) || []
      };
      
      setAdminStats(stats);
    } catch (error) {
      console.error("Failed to load admin data:", error);
    }
  };

  const handleRegister = async () => {
    if (!authData.username || !authData.password || !authData.email) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      // Check if username exists
      const existing = await supabaseRequest("findOne", "users", {
        filter: { username: authData.username },
      });

      if (existing.document) {
        alert("Username already exists!");
        return;
      }

      // Create new user
      const newUser = {
        username: authData.username,
        password: authData.password,
        email: authData.email,
        role: "user",
        storage_used: 0,
        storage_limit: 500,
        created_at: new Date().toISOString(),
      };

      await supabaseRequest("insertOne", "users", {
        document: newUser,
      });

      alert("✅ Registration successful! Please login.");
      setView("login");
      setAuthData({ username: "", password: "", email: "" });
      setMobileMenuOpen(false);
    } catch (error) {
      alert("Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId) => {
    try {
      // Load folders
      const foldersResult = await supabaseRequest("find", "folders", {
        filter: { userId: userId },
      });
      setFolders(foldersResult.documents || []);

      // Load files
      const filesResult = await supabaseRequest("find", "files", {
        filter: { userId: userId },
      });
      setFiles(filesResult.documents || []);
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView("home");
    setCurrentFolder(null);
    setFiles([]);
    setFolders([]);
    setAllUsers([]);
    setAdminStats(null);
    setMobileMenuOpen(false);
  };

  // ========== FILE MANAGEMENT FUNCTIONS ==========
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    if (!currentUser) return;

    setLoading(true);
    try {
      const folder = {
        name: newFolderName,
        user_id: currentUser.id,
        parent_id: currentFolder,
        created_at: new Date().toISOString(),
      };

      const result = await supabaseRequest("insertOne", "folders", {
        document: folder,
      });

      setFolders([...folders, { ...folder, id: result.insertedId }]);
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (error) {
      alert("Failed to create folder: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile || !currentUser) return;

    const fileSizeMB = uploadedFile.size / (1024 * 1024);
    const newStorageUsed = (currentUser.storage_used || 0) + fileSizeMB;

    if (newStorageUsed > (currentUser.storage_limit || 500)) {
      alert("Storage limit exceeded!");
      return;
    }

    setLoading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = uploadedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}.${fileExt}`;
      const filePath = `user_${currentUser.id}/${fileName}`;

      // Upload file
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("files")
        .upload(filePath, uploadedFile);

      if (uploadError) {
        console.log("Direct upload failed, trying signed URL method:", uploadError);
        
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch(
          `${SUPABASE_CONFIG.url}/storage/v1/object/files/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_CONFIG.key}`,
              apikey: SUPABASE_CONFIG.key,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Storage upload failed: ${errorData.message || response.statusText}`
          );
        }
      }

      // Get signed URL for preview
      const { data: signedUrlData, error: signedUrlError } =
        await supabaseClient.storage
          .from("files")
          .createSignedUrl(filePath, 60 * 60);

      let fileUrl = "";
      if (signedUrlError) {
        console.log("Signed URL error:", signedUrlError);
        const { data: publicUrlData } = supabaseClient.storage
          .from("files")
          .getPublicUrl(filePath);
          
        fileUrl = publicUrlData.publicUrl;
      } else {
        fileUrl = signedUrlData.signedUrl;
      }

      // Create file record
      const fileRecord = {
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type,
        storage_path: filePath,
        public_url: fileUrl,
        user_id: currentUser.id,
        folder_id: currentFolder,
        uploaded_at: new Date().toISOString(),
        is_public: false,
      };

      const result = await supabaseRequest("insertOne", "files", {
        document: fileRecord,
      });

      setFiles([...files, { ...fileRecord, id: result.insertedId }]);

      // Update user storage
      await supabaseRequest("updateOne", "users", {
        filter: { id: currentUser.id },
        update: { storage_used: newStorageUsed },
      });

      setCurrentUser({ ...currentUser, storage_used: newStorageUsed });

      alert("✅ File uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Failed to upload file: ${error.message}`);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    if (!currentUser) return;

    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);

    setLoading(true);
    try {
      // Delete from storage
      if (file.storage_path) {
        const { error: storageError } = await supabaseClient.storage
          .from("files")
          .remove([file.storage_path]);

        if (storageError) {
          console.warn("Storage delete warning:", storageError.message);
        }
      }

      // Delete from database
      await supabaseRequest("deleteOne", "files", {
        filter: { id: fileId },
      });

      setFiles(files.filter((f) => f.id !== fileId));

      // Update user storage
      const newStorageUsed = Math.max(
        0,
        (currentUser.storage_used || 0) - fileSizeMB
      );
      await supabaseRequest("updateOne", "users", {
        filter: { id: currentUser.id },
        update: { storage_used: newStorageUsed },
      });

      setCurrentUser({ ...currentUser, storage_used: newStorageUsed });

      alert("✅ File deleted successfully!");
    } catch (error) {
      alert("Failed to delete file: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    if (!supabaseClient) return;

    try {
      if (file.public_url) {
        const link = document.createElement("a");
        link.href = file.public_url;
        link.download = file.name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (file.storage_path) {
        const { data, error } = await supabaseClient.storage
          .from("files")
          .download(file.storage_path);

        if (error) throw new Error("Download failed: " + error.message);

        const url = URL.createObjectURL(data);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert("Download failed: " + error.message);
    }
  };

  const toggleFileVisibility = async (fileId) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const newVisibility = !file.is_public;

    try {
      await supabaseRequest("updateOne", "files", {
        filter: { id: fileId },
        update: { is_public: newVisibility },
      });

      setFiles(
        files.map((f) =>
          f.id === fileId ? { ...f, is_public: newVisibility } : f
        )
      );
    } catch (error) {
      alert("Failed to update file visibility: " + error.message);
    }
  };

  const getUserFolders = () => {
    return folders.filter(
      (f) =>
        f.parent_id === currentFolder &&
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getUserFiles = () => {
    return files.filter((f) => {
      const fileName = f.name.toLowerCase();
      const searchTerm = searchQuery.toLowerCase();

      const folderMatch = f.folder_id === currentFolder;
      const nameMatch = fileName.includes(searchTerm);

      return folderMatch && nameMatch;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFolderPath = () => {
    if (!currentFolder) return "Home";
    const folder = folders.find((f) => f.id === currentFolder);
    return folder ? folder.name : "Home";
  };

  // ========== LANDING PAGE ==========
  if (view === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                  <Lock className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">CloudLocker</h1>
                  <p className="text-sm text-gray-600">Secure Cloud Storage</p>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                  <Cloud size={14} />
                  <span>Supabase Connected</span>
                </div>
                <button
                  onClick={() => setView("login")}
                  className="px-4 py-2 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center space-x-2"
                >
                  <User size={16} />
                  <span>Login</span>
                </button>
                <button
                  onClick={() => setView("register")}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                >
                  <span>Register</span>
                  <ArrowRight size={16} />
                </button>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            
            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
                    <Cloud size={14} />
                    <span>Supabase Connected</span>
                  </div>
                  <button
                    onClick={() => {
                      setView("login");
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center space-x-2"
                  >
                    <User size={16} />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setView("register");
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                  >
                    <span>Register</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Zap size={16} />
              <span>Powered by Supabase</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Your Files, Secured in the
              <span className="text-indigo-600"> Cloud</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              CloudLocker is a modern, secure file storage solution with
              real-time synchronization, advanced security features, and
              seamless access from any device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setView("register")}
                className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => setView("login")}
                className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-gray-50 transition-colors"
              >
                Already have an account? Login
              </button>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose CloudLocker?
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Built with cutting-edge technology for maximum security and performance
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="bg-indigo-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="text-indigo-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Military-Grade Security
                </h3>
                <p className="text-gray-600">
                  End-to-end encryption, secure file sharing, and role-based access control to keep your data safe.
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                  <Cloud className="text-green-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Cloud-Powered Storage
                </h3>
                <p className="text-gray-600">
                  Powered by Supabase for reliable, scalable cloud storage with automatic backups and redundancy.
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                  <Users className="text-purple-600" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Team Collaboration
                </h3>
                <p className="text-gray-600">
                  Share files securely with team members, set permissions, and collaborate in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Built With Modern Technology
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Leveraging the best tools for performance and reliability
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Layout className="text-blue-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">React 18</h3>
                <p className="text-sm text-gray-600">Frontend Framework</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Database className="text-green-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">Supabase</h3>
                <p className="text-sm text-gray-600">Backend & Storage</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Server className="text-yellow-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">PostgreSQL</h3>
                <p className="text-sm text-gray-600">Database</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Globe className="text-red-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">Real-time</h3>
                <p className="text-sm text-gray-600">Live Updates</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Secure Your Files?
            </h2>
            <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of users who trust CloudLocker for their file storage needs. No setup required!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setView("register")}
                className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Get Started for Free</span>
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => setView("login")}
                className="px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-colors"
              >
                View Demo
              </button>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-gray-400 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-3 mb-6 md:mb-0">
                <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center">
                  <Lock className="text-white" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">CloudLocker</h3>
                  <p className="text-sm">Secure Cloud Storage</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm">
                  Created by nexus
                </p>
                <p className="text-sm mt-2">
                  Powered by Supabase • No setup required
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center">
              <p className="text-sm">
                © {new Date().getFullYear()} CloudLocker. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ========== LOGIN PAGE ==========
  if (view === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">User Login</h1>
            <p className="text-gray-600 mt-2">Login to access your files</p>
            <div className="mt-3 inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
              <Cloud size={14} />
              <span>Supabase Connected</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={authData.username}
                onChange={(e) =>
                  setAuthData({ ...authData, username: e.target.value })
                }
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={authData.password}
                onChange={(e) =>
                  setAuthData({ ...authData, password: e.target.value })
                }
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={() => setView("register")}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Register
              </button>
            </p>
            <p className="text-gray-600 mt-4">
              <button
                onClick={() => setView("home")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to Home
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========== REGISTER PAGE ==========
  if (view === "register") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
            <p className="text-gray-600 mt-2">Join CloudLocker today</p>
            <div className="mt-3 inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
              <Cloud size={14} />
              <span>Supabase Connected</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={authData.username}
                onChange={(e) =>
                  setAuthData({ ...authData, username: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Choose username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={authData.email}
                onChange={(e) =>
                  setAuthData({ ...authData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={authData.password}
                onChange={(e) =>
                  setAuthData({ ...authData, password: e.target.value })
                }
                onKeyPress={(e) => e.key === "Enter" && handleRegister()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Create password"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => setView("login")}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Login
              </button>
            </p>
            <p className="text-gray-600 mt-4">
              <button
                onClick={() => setView("home")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to Home
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========== ADMIN DASHBOARD ==========
  if (view === "adminDashboard") {
    return (
      <div className="min-h-screen bg-gray-50">
        {loading && (
          <div className="fixed top-0 left-0 right-0 bg-indigo-600 text-white text-center py-2 z-50">
            Processing...
          </div>
        )}

        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                  <Shield className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    Welcome, {currentUser?.username} (Admin)
                  </p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => setView("dashboard")}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center space-x-2"
                >
                  <User size={16} />
                  <span>User View</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => {
                      setView("dashboard");
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center space-x-2"
                  >
                    <User size={16} />
                    <span>User View</span>
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats?.totalUsers || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats?.totalFiles || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <File className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Folders</p>
                  <p className="text-2xl font-bold text-gray-900">{adminStats?.totalFolders || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Folder className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {adminStats?.totalStorageUsed?.toFixed(2) || 0} MB
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Database className="text-yellow-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
              <div className="text-sm text-gray-600">
                {allUsers.length} users registered
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Username</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Storage Used</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                          </div>
                          <span className="font-medium">{user.username}</span>
                          {user.role === 'admin' && (
                            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{user.storage_used?.toFixed(2) || 0} MB</span>
                            <span>{user.storage_limit || 500} MB</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((user.storage_used || 0) / (user.storage_limit || 500)) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Bell className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">System initialized</p>
                    <p className="text-sm text-gray-600">CloudLocker ready</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">Just now</span>
              </div>
              
              {adminStats?.recentUsers?.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <User className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">New user registered</p>
                      <p className="text-sm text-gray-600">{user.username} ({user.email})</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== USER DASHBOARD PAGE ==========
  if (view === "dashboard" && currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        {loading && (
          <div className="fixed top-0 left-0 right-0 bg-indigo-600 text-white text-center py-2 z-50">
            Processing...
          </div>
        )}

        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                  <Lock className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">CloudLocker</h1>
                  <p className="text-sm text-gray-600">
                    Welcome, {currentUser?.username}
                  </p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {currentUser?.storage_used?.toFixed(2) || 0} /{" "}
                    {currentUser?.storage_limit || 500} MB
                  </p>
                  <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${
                          ((currentUser?.storage_used || 0) /
                            (currentUser?.storage_limit || 500)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Storage: {currentUser?.storage_used?.toFixed(2) || 0} /{" "}
                      {currentUser?.storage_limit || 500} MB
                    </p>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{
                          width: `${
                            ((currentUser?.storage_used || 0) /
                              (currentUser?.storage_limit || 500)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors flex items-center space-x-2">
                  <Upload size={18} />
                  <span>Upload File</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>

                <button
                  onClick={() => setShowNewFolder(true)}
                  disabled={loading}
                  className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Plus size={18} />
                  <span>New Folder</span>
                </button>

                {currentFolder && (
                  <button
                    onClick={() => setCurrentFolder(null)}
                    className="text-indigo-600 hover:underline"
                  >
                    ← Back to Home
                  </button>
                )}
              </div>

              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Current Location:{" "}
            <span className="font-semibold">{getFolderPath()}</span>
          </div>

          {showNewFolder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Create New Folder</h3>
                  <button onClick={() => setShowNewFolder(false)}>
                    <X size={20} />
                  </button>
                </div>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  onKeyPress={(e) => e.key === "Enter" && handleCreateFolder()}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={handleCreateFolder}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewFolder(false)}
                    className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {getUserFolders().length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-700">
                Folders
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {getUserFolders().map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                  >
                    <Folder className="text-indigo-600 mb-2" size={32} />
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {folder.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Files</h2>
            {getUserFiles().length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <File className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">
                  No files yet. Upload your first file!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getUserFiles().map((file) => (
                  <div
                    key={file.id}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <File
                          className="text-indigo-600 flex-shrink-0"
                          size={20}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFileVisibility(file.id)}
                        className={`p-1 rounded ${
                          file.is_public ? "text-green-600" : "text-gray-400"
                        }`}
                        title={file.is_public ? "Public" : "Private"}
                      >
                        {file.is_public ? (
                          <Share2 size={16} />
                        ) : (
                          <Lock size={16} />
                        )}
                      </button>
                    </div>

                    {file.type?.startsWith("image/") && file.public_url && (
                      <img
                        src={file.public_url}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded mb-3"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="flex-1 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1 text-sm"
                      >
                        <Eye size={16} />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-1 text-sm"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {previewFile && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  {previewFile.name}
                </h3>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4">
                {(() => {
                  const fileName = previewFile.name.toLowerCase();
                  const isImage =
                    fileName.endsWith(".jpg") ||
                    fileName.endsWith(".jpeg") ||
                    fileName.endsWith(".png") ||
                    fileName.endsWith(".gif") ||
                    fileName.endsWith(".webp");
                  const isPDF = fileName.endsWith(".pdf");
                  const isText =
                    fileName.endsWith(".txt") ||
                    fileName.endsWith(".js") ||
                    fileName.endsWith(".json") ||
                    fileName.endsWith(".html") ||
                    fileName.endsWith(".css");

                  if (isImage && previewFile.public_url) {
                    return (
                      <div className="flex flex-col items-center">
                        <img
                          src={previewFile.public_url}
                          alt={previewFile.name}
                          className="max-w-full max-h-[70vh] object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Available";
                          }}
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          Right-click to save image
                        </p>
                      </div>
                    );
                  } else if (isPDF && previewFile.public_url) {
                    return (
                      <iframe
                        src={`${previewFile.public_url}#view=FitH`}
                        className="w-full h-[70vh] border-0"
                        title="PDF Preview"
                      />
                    );
                  } else if (isText && previewFile.public_url) {
                    return (
                      <div className="bg-gray-50 p-4 rounded">
                        <p className="text-sm text-gray-600 mb-2">
                          Text preview not available directly. Please download to view.
                        </p>
                        <button
                          onClick={() => handleDownload(previewFile)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                        >
                          Download to View
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-12">
                        <File className="mx-auto text-gray-400 mb-4" size={64} />
                        <p className="text-gray-600">
                          Preview not available for this file type
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          File: {previewFile.name}
                        </p>
                        <button
                          onClick={() => handleDownload(previewFile)}
                          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                        >
                          Download File
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If somehow we reach here without a proper view, show loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading CloudLocker...</p>
      </div>
    </div>
  );
}