export function Credits() {
  return (
    <div className="p-10 flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight">MEET THE PEOPLE BEHIND VIEWLAB</h1>
          <p className="text-xl text-muted-foreground">
            A college project designed to make databases interactive.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <CreditCard 
            name="[ Name 1 ]"
            role="[ Role ]"
            contribution="[ Description of their contribution to the project ]"
          />
          <CreditCard 
            name="[ Name 2 ]"
            role="[ Role ]"
            contribution="[ Description of their contribution to the project ]"
          />
          <CreditCard 
            name="[ Name 3 ]"
            role="[ Role ]"
            contribution="[ Description of their contribution to the project ]"
          />
        </div>
      </div>
    </div>
  );
}

function CreditCard({ name, role, contribution }: { name: string, role: string, contribution: string }) {
  return (
    <div className="neo-surface p-6 flex flex-col items-center text-center space-y-4">
      <div className="w-24 h-24 rounded-full neo-surface-inset flex items-center justify-center mb-2 overflow-hidden">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">{role}</p>
      </div>
      <p className="text-sm text-muted-foreground pt-4 border-t border-border/50 w-full">
        {contribution}
      </p>
    </div>
  );
}
