const fs = require('fs');
const path = require('path');

function extractTrackInfo(trackPath) {
    const trackIndex = path.join(trackPath, 'index.html');
    if (!fs.existsSync(trackIndex)) return null;

    const content = fs.readFileSync(trackIndex, 'utf-8');

    // Extract Track Name
    let trackName = "";
    const nameMatch = content.match(/<h1[^>]*>([\s\S]*?)<br><span[^>]*>([\s\S]*?)<\/span><\/h1>/i);
    if (nameMatch) {
        trackName = (nameMatch[1].replace(/<[^>]+>/g, '').trim() + " " + nameMatch[2].replace(/<[^>]+>/g, '').trim());
    } else {
        const titleMatch = content.match(/<title>(.*?) \| Skillforge Academy<\/title>/i);
        trackName = titleMatch ? titleMatch[1].replace('Track: ', '') : path.basename(trackPath).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Extract Track Description
    const descMatch = content.match(/<meta name="description" content="(.*?)">/i);
    const trackDescription = descMatch ? descMatch[1] : "";

    const weeks = [];
    const weekHeaders = Array.from(content.matchAll(/<h3[^>]*>(Week \d+:.*?)<\/h3>/gi));

    for (let i = 0; i < weekHeaders.length; i++) {
        const weekNum = i + 1;
        const weekTitle = weekHeaders[i][1].trim();
        
        const startPos = weekHeaders[i].index;
        const nextHeader = weekHeaders[i+1];
        const endPos = nextHeader ? nextHeader.index : content.indexOf('<!-- Certification -->');
        const weekContent = content.substring(startPos, endPos === -1 ? content.length : endPos);
        
        const days = [];
        const dayLinks = Array.from(weekContent.matchAll(/<a href="\.\/week-(\d+)\/day-(\d+)\/"[^>]*>[\s\S]*?<span[^>]*>Day \d+<\/span>[\s\S]*?<span[^>]*>(.*?)<\/span>/gi));
        
        for (const [_, wNum, dNum, dTitle] of dayLinks) {
            const dayPath = path.join(trackPath, `week-${wNum}`, `day-${dNum}`, 'index.html');
            let dayDesc = "";
            if (fs.existsSync(dayPath)) {
                const dayHtml = fs.readFileSync(dayPath, 'utf-8');
                const dayDescMatch = dayHtml.match(/<meta name="description" content="(.*?)">/i);
                dayDesc = dayDescMatch ? dayDescMatch[1] : "";
            }
            
            days.push({
                day: parseInt(dNum),
                title: dTitle.trim().replace(/→/g, '').trim(),
                description: dayDesc
            });
        }
        
        weeks.push({
            week: weekNum,
            title: weekTitle,
            days: days
        });
    }

    return {
        track: trackName,
        description: trackDescription,
        weeks: weeks
    };
}

const academyPath = path.join(__dirname, 'academy');
const tracks = [];

fs.readdirSync(academyPath).forEach(item => {
    const itemPath = path.join(academyPath, item);
    if (fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'index.html'))) {
        const info = extractTrackInfo(itemPath);
        if (info) tracks.push(info);
    }
});

let html = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>Skillforge Academy Curriculum</title>\n' +
'    <script src="https://cdn.tailwindcss.com"></script>\n' +
'    <style>\n' +
"        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap');\n" +
"        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fafafa; color: #0f172a; margin: 0; padding: 0; }\n" +
'        .gold-gradient { background: linear-gradient(135deg, #eab308 0%, #b45309 100%); }\n' +
'        .gradient-text {\n' +
'            background: linear-gradient(135deg, #eab308 0%, #b45309 100%);\n' +
'            -webkit-background-clip: text;\n' +
'            -webkit-text-fill-color: transparent;\n' +
'            background-clip: text;\n' +
'            color: transparent;\n' +
'        }\n' +
'        .page-break { page-break-after: always; }\n' +
'        .card { background: white; border: 1px solid #e2e8f0; border-radius: 1.5rem; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }\n' +
'        .day-item { border-left: 4px solid #eab308; padding-left: 1.5rem; margin-bottom: 1.5rem; }\n' +
'        @media print {\n' +
'            @page {\n' +
'                size: A4;\n' +
'                margin: 20mm;\n' +
'            }\n' +
'            body { \n' +
'                background: white; \n' +
'                padding: 0 !important;\n' +
'                margin: 0 !important;\n' +
'            }\n' +
'            .max-w-5xl {\n' +
'                max-width: 100% !important;\n' +
'                width: 100% !important;\n' +
'            }\n' +
'            .no-print { display: none; }\n' +
'            .page-break { display: none; }\n' +
'            .card { \n' +
'                box-shadow: none !important; \n' +
'                border: 1px solid #e2e8f0 !important; \n' +
'                page-break-inside: avoid;\n' +
'                break-inside: avoid;\n' +
'                margin-bottom: 1.5rem !important;\n' +
'                padding: 1.5rem !important;\n' +
'            }\n' +
'            section {\n' +
'                page-break-before: always;\n' +
'                break-before: page;\n' +
'                padding-top: 1rem;\n' +
'            }\n' +
'            .track-header {\n' +
'                page-break-after: avoid;\n' +
'                break-after: avoid;\n' +
'            }\n' +
'            header {\n' +
'                height: 90vh;\n' +
'                display: flex;\n' +
'                flex-direction: column;\n' +
'                justify-content: center;\n' +
'                page-break-after: always;\n' +
'                break-after: page;\n' +
'                margin-bottom: 0 !important;\n' +
'            }\n' +
'            .day-item {\n' +
'                page-break-inside: avoid;\n' +
'                break-inside: avoid;\n' +
'            }\n' +
'            h1, h2, h3 {\n' +
'                page-break-after: avoid;\n' +
'                break-after: avoid;\n' +
'            }\n' +
'        }\n' +
'    </style>\n' +
'</head>\n' +
'<body class="p-8 md:p-16">\n' +
'    <header class="text-center mb-20">\n' +
'        <div class="flex justify-center mb-8">\n' +
'            <div class="w-20 h-20 bg-black rounded-3xl flex items-center justify-center border-2 border-amber-500 transform rotate-3 shadow-xl">\n' +
'                <img src="/assets/brand-logo.svg" alt="SkillForge Digital logo" class="w-16 h-16 object-cover rounded-2xl">\n' +
'            </div>\n' +
'        </div>\n' +
'        <h1 class="text-6xl font-black tracking-tighter uppercase mb-4">Skillforge <br><span class="gradient-text">Academy Curriculum</span></h1>\n' +
'        <p class="text-slate-500 text-xl font-medium tracking-widest uppercase italic">"Forging Digital Legacies"</p>\n' +
'        <div class="mt-8 h-1 w-32 bg-amber-500 mx-auto rounded-full"></div>\n' +
'    </header>\n' +
'\n' +
'    <div class="max-w-5xl mx-auto">\n' +
'        <div class="card bg-slate-900 text-white border-none relative overflow-hidden mb-16">\n' +
'            <div class="absolute inset-0 gold-gradient opacity-10"></div>\n' +
'            <div class="relative z-10">\n' +
'                <h2 class="text-3xl font-black uppercase tracking-widest mb-6">Introduction</h2>\n' +
'                <p class="text-slate-300 text-lg leading-relaxed mb-6">\n' +
'                    Welcome to the Skillforge Academy Curriculum. This document outlines our comprehensive tracks designed for high-velocity creators and digital professionals. Each track is meticulously crafted to take students from foundational concepts to advanced mastery over a 3-week intensive period.\n' +
'                </p>\n' +
'                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">\n' +
'                    <div class="text-center">\n' +
'                        <div class="text-4xl font-black text-amber-500 mb-2">10+</div>\n' +
'                        <div class="text-xs font-bold uppercase tracking-widest text-slate-400">Specialized Tracks</div>\n' +
'                    </div>\n' +
'                    <div class="text-center">\n' +
'                        <div class="text-4xl font-black text-amber-500 mb-2">3 Weeks</div>\n' +
'                        <div class="text-xs font-bold uppercase tracking-widest text-slate-400">Intensive Learning</div>\n' +
'                    </div>\n' +
'                    <div class="text-center">\n' +
'                        <div class="text-4xl font-black text-amber-500 mb-2">Project</div>\n' +
'                        <div class="text-xs font-bold uppercase tracking-widest text-slate-400">Based Mastery</div>\n' +
'                    </div>\n' +
'                </div>\n' +
'            </div>\n' +
'        </div>\n' +
'\n' +
'        ' + tracks.map((track, trackIndex) => `
            <section class="mb-20">
                <div class="track-header">
                    <div class="flex items-center gap-6 mb-10">
                        <div class="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-amber-500/20">
                            ${trackIndex + 1}
                        </div>
                        <div>
                            <h2 class="text-4xl font-black uppercase tracking-tight">${track.track.replace(/\.$/, '')}</h2>
                            <p class="text-amber-600 font-bold uppercase tracking-widest text-sm">Professional Track</p>
                        </div>
                    </div>
                    
                    <p class="text-slate-600 text-xl mb-12 italic border-l-4 border-slate-200 pl-6 leading-relaxed">
                        "${track.description}"
                    </p>
                </div>

                <div class="space-y-12">
                    ${track.weeks.map(week => `
                        <div class="card">
                            <h3 class="text-2xl font-black mb-8 uppercase tracking-widest text-slate-900 flex items-center gap-4">
                                <span class="w-12 h-1 bg-amber-500 rounded-full"></span>
                                ${week.title}
                            </h3>
                            <div class="space-y-8">
                                ${week.days.map(day => `
                                    <div class="day-item">
                                        <div class="flex justify-between items-start mb-2">
                                            <span class="text-xs font-black text-amber-600 uppercase tracking-widest">Day ${day.day}</span>
                                        </div>
                                        <h4 class="text-xl font-bold text-slate-900 mb-3">${day.title}</h4>
                                        <p class="text-slate-500 leading-relaxed text-base">
                                            ${day.description || "In-depth exploration of core concepts and practical application."}
                                        </p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `).join('') +
'\n' +
'        <footer class="text-center mt-24 pt-12 border-t border-slate-200">\n' +
'            <div class="flex justify-center mb-8">\n' +
'                <div class="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-amber-500">\n' +
'                    <img src="/assets/brand-logo.svg" alt="SkillForge Digital logo" class="w-10 h-10 object-cover rounded-lg">\n' +
'                </div>\n' +
'            </div>\n' +
'            <p class="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">&copy; 2026 Skillforge Digital & Co. LTD</p>\n' +
'            <p class="text-slate-400 text-[10px] mt-2 tracking-widest uppercase">Lagos, Nigeria | Digital First</p>\n' +
'        </footer>\n' +
'    </div>\n' +
'</body>\n' +
'</html>';

fs.writeFileSync('curriculum.html', html);
console.log('HTML curriculum regenerated with print-optimized A4 layout.');
