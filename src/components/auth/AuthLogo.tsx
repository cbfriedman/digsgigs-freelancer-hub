import { useNavigate } from "react-router-dom";
import logo from "@/assets/digsandgigs-logo.png";

export const AuthLogo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex justify-center mb-6 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => navigate("/")}
    >
      <img 
        src={logo} 
        alt="Digs & Gigs" 
        className="h-12 w-auto object-contain"
      />
    </div>
  );
};
