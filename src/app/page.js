import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Business Mart</h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        A modular business management system designed for shops, traders, and small businesses.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/dashboard" 
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link 
          href="/login" 
          className="bg-secondary text-secondary-foreground px-6 py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
