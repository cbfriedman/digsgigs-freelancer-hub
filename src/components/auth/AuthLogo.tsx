import { useNavigate } from "react-router-dom";

export const AuthLogo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex justify-center mb-6 cursor-pointer"
      onClick={() => navigate("/")}
    >
      <div className="relative">
        {/* Mountain-like logo similar to reference */}
        <svg 
          width="60" 
          height="40" 
          viewBox="0 0 60 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
        >
          <path 
            d="M30 5L45 35H15L30 5Z" 
            fill="url(#gradient1)" 
          />
          <path 
            d="M20 15L30 35H10L20 15Z" 
            fill="url(#gradient2)" 
            opacity="0.7"
          />
          <path 
            d="M40 15L50 35H30L40 15Z" 
            fill="url(#gradient3)" 
            opacity="0.7"
          />
          <defs>
            <linearGradient id="gradient1" x1="30" y1="5" x2="30" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(var(--primary))" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="gradient2" x1="20" y1="15" x2="20" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(var(--success))" />
              <stop offset="1" stopColor="hsl(var(--success))" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="gradient3" x1="40" y1="15" x2="40" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(var(--accent))" />
              <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
