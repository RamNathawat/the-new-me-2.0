import fs from 'fs';

const htmlPath = 'src/vanilla-layout.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const newMapHTML = `    <!-- ════════════ CHAPTER SHOWCASE — Organic Wellness Map ════════════ -->
    <section id="s-map" class="s s--map" style="background: transparent;">
      <div class="map__viewport" id="map-viewport" style="cursor: default;">

        <div class="map__canvas" id="map-canvas">
          <!-- Elegant Organic Background SVG -->
          <svg class="map__illustration" viewBox="0 0 3000 2000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            
            <!-- Soft Organic Journey Path -->
            <path d="M200,1000 C600,600 1200,1400 1500,1000 C1800,600 2400,1400 2800,1000" fill="none" stroke="#2D5A27" stroke-width="4" stroke-dasharray="12 24" stroke-linecap="round" opacity="0.3"/>
            <path d="M200,1000 C600,600 1200,1400 1500,1000 C1800,600 2400,1400 2800,1000" fill="none" stroke="#C5D86D" stroke-width="2" stroke-linecap="round" opacity="0.5"/>

            <!-- Subtle Leaves floating around -->
            <g opacity="0.4" fill="#2D5A27">
              <!-- Leaf 1 -->
              <path d="M600,700 Q620,680 640,700 Q620,720 600,700" />
              <!-- Leaf 2 -->
              <path d="M1200,1200 Q1230,1170 1260,1200 Q1230,1230 1200,1200" fill="#C5D86D" />
              <!-- Leaf 3 -->
              <path d="M1800,750 Q1820,720 1850,750 Q1820,780 1800,750" />
              <!-- Leaf 4 -->
              <path d="M2400,1250 Q2420,1230 2440,1250 Q2420,1270 2400,1250" fill="#C5D86D" />
            </g>

          </svg>

          <!-- Organic Chapter Nodes -->
          <button class="map__ch map__ch--organic" data-ch="0" style="left:20%; top:30%;" id="ch-nutrition">
            <div class="ch-ring"></div>
            <span class="map__ch-pre">01</span>
            <span class="map__ch-title">Nutrition</span>
          </button>

          <button class="map__ch map__ch--organic" data-ch="1" style="left:40%; top:70%;" id="ch-fitness">
            <div class="ch-ring"></div>
            <span class="map__ch-pre">02</span>
            <span class="map__ch-title">Movement</span>
          </button>

          <button class="map__ch map__ch--organic" data-ch="2" style="left:60%; top:30%;" id="ch-sleep">
            <div class="ch-ring"></div>
            <span class="map__ch-pre">03</span>
            <span class="map__ch-title">Recovery</span>
          </button>

          <button class="map__ch map__ch--organic" data-ch="3" style="left:80%; top:70%;" id="ch-mindset">
            <div class="ch-ring"></div>
            <span class="map__ch-pre">04</span>
            <span class="map__ch-title">Mindset</span>
          </button>

        </div>
      </div>
    </section>`;

const startIdx = html.indexOf('<!-- ════════════ CHAPTER SHOWCASE — Compressed Map ════════════ -->');
const endIdx = html.indexOf('<!-- ════════════ ABOUT THE AUTHOR ════════════ -->');

if (startIdx !== -1 && endIdx !== -1) {
  html = html.slice(0, startIdx) + newMapHTML + '\n\n    ' + html.slice(endIdx);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Map updated successfully');
} else {
  console.log('Could not find map indices');
}
