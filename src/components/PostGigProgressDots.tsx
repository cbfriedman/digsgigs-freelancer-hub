interface PostGigProgressDotsProps {
  currentStep: number;
  totalSteps?: number;
}

const PostGigProgressDots = ({ currentStep, totalSteps = 4 }: PostGigProgressDotsProps) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        
        return (
          <div
            key={step}
            className={`
              transition-all duration-300 rounded-full
              ${isActive 
                ? 'w-8 h-2 bg-primary' 
                : isCompleted 
                  ? 'w-2 h-2 bg-primary' 
                  : 'w-2 h-2 bg-muted-foreground/30'
              }
            `}
          />
        );
      })}
    </div>
  );
};

export default PostGigProgressDots;
