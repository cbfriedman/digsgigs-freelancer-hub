const RegisterTest = () => {
  console.log('RegisterTest component mounted!');
  console.log('Current pathname:', window.location.pathname);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Register Route Works!</h1>
        <p className="text-muted-foreground">This is a test component to verify routing.</p>
        <p className="text-sm text-muted-foreground">Path: {window.location.pathname}</p>
      </div>
    </div>
  );
};

export default RegisterTest;
