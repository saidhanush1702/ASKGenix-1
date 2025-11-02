import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "student";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Check for persisted user in localStorage on mount
  useEffect(() => {
    checkUser();
  }, []);

  async function testFetchUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("email");

  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("All user emails:", data);
  }
}



  const checkUser = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, role")
        .eq("id", userId)
        .maybeSingle();

      if (data && !error) {
        setUser(data);
      } else {
        localStorage.removeItem("userId");
      }
    }
    setLoading(false);
  };

  // ✅ SIGN IN
  const signIn = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      
      console.log(cleanEmail, cleanPassword);
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, role, password_hash")
        .ilike("email", cleanEmail)
        .maybeSingle();
 
      
      testFetchUsers();
      if (error) {
        console.error("Supabase error during signIn:", error);
        return { success: false, error: "An error occurred during login." };
      }

      if (!data) {
        return { success: false, error: "Invalid email or password." };
      }

      // Simple password check (update to bcrypt later)
      if (data.password_hash !== cleanPassword) {
        return { success: false, error: "Invalid email or password." };
      }

      const userData: User = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      };

      setUser(userData);
      localStorage.setItem("userId", data.id);
      return { success: true };
    } catch (err) {
      console.error("Unexpected error during signIn:", err);
      return { success: false, error: "Unexpected error during login." };
    }
  };

  // ✅ SIGN UP
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: "Email already registered." };
      }

      // Insert new user
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            email: cleanEmail,
            password_hash: cleanPassword,
            full_name: fullName,
            role: "student",
          },
        ])
        .select("id, email, full_name, role")
        .single();

      if (error || !data) {
        console.error("Supabase insert error:", error);
        return { success: false, error: "Failed to create account." };
      }

      const userData: User = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      };

      setUser(userData);
      localStorage.setItem("userId", data.id);
      return { success: true };
    } catch (err) {
      console.error("Unexpected error during signUp:", err);
      return { success: false, error: "Unexpected error during sign up." };
    }
  };

  // ✅ SIGN OUT
  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("userId");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
      
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
