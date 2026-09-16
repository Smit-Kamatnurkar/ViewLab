

interface TeamMember {
  name: string;
  regNo: string;
  role: string;
  initials: string;
  photoUrl?: string;
  gradient: string;
}

const TEAM: TeamMember[] = [
  {
    name: 'Smit S Kamatnurkar',
    regNo: '25BCE1099',
    role: 'Lead Developer',
    initials: 'SK',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'Arushi Grover',
    regNo: '25BCE1190',
    role: 'Developer',
    initials: 'AG',
    gradient: 'from-purple-600 to-pink-600',
  }
];

export function Credits() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background text-foreground p-6 md:p-10 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
            <span>Project Documentation</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            B. Developed By
          </h1>

          <div className="pt-1">
            <h2 className="text-lg md:text-xl font-semibold text-primary">
              ViewLab — View & Materialized View Simulator
            </h2>
          </div>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed pt-2">
            Developed as an interactive DBMS learning and visualization platform for understanding Views, Materialized Views, dependencies, query execution and refresh behavior.
          </p>
        </header>

        {/* Team Members Section */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Project Team
            </h3>
            <div className="w-12 h-0.5 bg-primary/40 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {TEAM.map((member, idx) => (
              <div 
                key={idx}
                className="group bg-card border border-border/80 hover:border-primary/50 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center space-y-5"
              >
                {/* Student Photograph / Placeholder */}
                <div className="relative w-36 h-44 rounded-xl overflow-hidden shadow-inner border-2 border-border/60 group-hover:border-primary/60 transition-colors bg-muted flex flex-col items-center justify-center">
                  {member.photoUrl ? (
                    <img 
                      src={member.photoUrl} 
                      alt={member.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${member.gradient} flex flex-col items-center justify-center text-white space-y-2 p-4`}>
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl shadow-inner border border-white/30">
                        {member.initials}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                        Student Photo
                      </span>
                    </div>
                  )}
                </div>

                {/* Student Details */}
                <div className="space-y-1.5 w-full">
                  <h4 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {member.name}
                  </h4>
                  <div className="inline-block px-3 py-1 rounded-md bg-muted text-foreground font-mono text-sm font-semibold border border-border/50">
                    {member.regNo}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 w-full flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Faculty Guidance Section */}
        <section className="pt-6">
          <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 text-center space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <span>Guided By</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-foreground">
                Dr. Swaminathan A
              </h3>
              <p className="text-sm font-semibold text-primary">
                Assistant Professor
              </p>
            </div>

            <p className="text-xs text-muted-foreground max-w-md mx-auto pt-2 border-t border-border/40">
              Department of Computer Science & Engineering • School of Computer Science & Engineering (SCOPE)
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
