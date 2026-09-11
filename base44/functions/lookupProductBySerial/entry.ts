import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Sample SAGE ERP product catalog used while the real SAGE connection is wired up.
// To connect your real SAGE ERP: set the SAGE_API_URL and SAGE_API_KEY secrets in
// dashboard settings, then replace the `lookupInSage` body with a fetch to your
// SAGE endpoint using those secrets.
const SAMPLE_PRODUCTS = {
  "SN-10045-A": {
    serial_number: "SN-10045-A",
    model_number: "GX-4500",
    product_name: "GuardianX 4500 Industrial Controller",
    product_description: "Programmable logic controller for industrial automation with 16 I/O channels, dual Ethernet ports, and modular expansion.",
    category: "Controllers",
    manufacturer: "Guardian Industrial",
    image_url: "https://images.unsplash.com/photo-1581092160562-40aa67e1f0d3?w=800&q=80",
    manuals: [
      { title: "GuardianX 4500 User Manual", url: "https://example.com/manuals/gx4500-user.pdf", file_type: "PDF" },
      { title: "GuardianX 4500 Installation Guide", url: "https://example.com/manuals/gx4500-install.pdf", file_type: "PDF" }
    ],
    wiring_diagrams: [
      { title: "Standard I/O Wiring Diagram", url: "https://example.com/diagrams/gx4500-io.pdf" },
      { title: "Ethernet Expansion Wiring", url: "https://example.com/diagrams/gx4500-ethernet.pdf" }
    ],
    videos: [
      { title: "GuardianX 4500 Setup Walkthrough", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnail: "https://images.unsplash.com/photo-1593642632842-3d2c4b4b4b4b?w=400&q=80" }
    ],
    faqs: [
      { question: "How do I reset the controller to factory defaults?", answer: "Hold the reset button on the front panel for 10 seconds while powered on. The status LED will flash amber three times to confirm." },
      { question: "What is the operating temperature range?", answer: "-20°C to +60°C (-4°F to 140°F) with adequate ventilation." }
    ],
    troubleshooting: [
      { problem: "Status LED is solid red", solution: "Indicates a firmware fault. Power-cycle the unit; if it persists, reflash firmware via the USB service port." },
      { problem: "No Ethernet link on port 2", solution: "Verify the cable is CAT5e or better and the connected switch is powered. Check that port 2 is enabled in the network configuration." }
    ],
    parts_links: [
      { part_number: "GX4500-PSU", name: "Replacement Power Supply Unit", url: "https://parts.example.com/gx4500-psu", price: 89.00 },
      { part_number: "GX4500-IO16", name: "16-Channel I/O Expansion Card", url: "https://parts.example.com/gx4500-io16", price: 145.50 },
      { part_number: "GX4500-CABLE", name: "Programming Cable (USB-A to USB-C)", url: "https://parts.example.com/gx4500-cable", price: 24.99 }
    ]
  },
  "SN-22087-B": {
    serial_number: "SN-22087-B",
    model_number: "VortexFlow 220",
    product_name: "VortexFlow 220 Variable Frequency Drive",
    product_description: "Compact VFD for 3-phase motor control up to 15kW, with built-in PID control and Modbus communication.",
    category: "Drives",
    manufacturer: "Vortex Motion",
    image_url: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&q=80",
    manuals: [
      { title: "VortexFlow 220 Operation Manual", url: "https://example.com/manuals/vf220-operation.pdf", file_type: "PDF" },
      { title: "VortexFlow 220 Parameter Reference", url: "https://example.com/manuals/vf220-params.pdf", file_type: "PDF" }
    ],
    wiring_diagrams: [
      { title: "Power & Motor Wiring", url: "https://example.com/diagrams/vf220-power.pdf" },
      { title: "Modbus Communication Wiring", url: "https://example.com/diagrams/vf220-modbus.pdf" }
    ],
    videos: [
      { title: "VortexFlow 220 Commissioning", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnail: "https://images.unsplash.com/photo-1535378620166-27370828a011?w=400&q=80" }
    ],
    faqs: [
      { question: "Can I run a 5kW motor on the VortexFlow 220?", answer: "Yes — the VortexFlow 220 supports motors up to 15kW. Ensure the motor full-load current is within the drive's rated output current." },
      { question: "How do I enable PID control?", answer: "Set parameter P0.06 to 1, then configure the PID setpoint and feedback source in parameter group P4." }
    ],
    troubleshooting: [
      { problem: "Drive trips with fault code OC-1", solution: "Overcurrent during acceleration. Increase the acceleration time (P0.10) or check for a short circuit on the motor leads." },
      { problem: "Motor runs in reverse", solution: "Swap any two of the three motor output phases (U, V, W), or set parameter P0.12 to reverse the rotation direction in software." }
    ],
    parts_links: [
      { part_number: "VF220-HMI", name: "Remote HMI Keypad", url: "https://parts.example.com/vf220-hmi", price: 65.00 },
      { part_number: "VF220-FAN", name: "Cooling Fan Assembly", url: "https://parts.example.com/vf220-fan", price: 38.50 },
      { part_number: "VF220-MEM", name: "Parameter Memory Module", url: "https://parts.example.com/vf220-mem", price: 52.00 }
    ]
  },
  "SN-55301-C": {
    serial_number: "SN-55301-C",
    model_number: "AeroSense AS-12",
    product_name: "AeroSense AS-12 Pressure Transmitter",
    product_description: "Industrial pressure transmitter with 4-20mA output, stainless steel diaphragm, and 0.25% accuracy for process monitoring.",
    category: "Sensors",
    manufacturer: "AeroSense Instruments",
    image_url: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=80",
    manuals: [
      { title: "AeroSense AS-12 Instruction Manual", url: "https://example.com/manuals/as12-instruction.pdf", file_type: "PDF" }
    ],
    wiring_diagrams: [
      { title: "4-20mA Loop Wiring", url: "https://example.com/diagrams/as12-loop.pdf" }
    ],
    videos: [
      { title: "AeroSense AS-12 Calibration", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnail: "https://images.unsplash.com/photo-1518306727298-4c0e0e9c7d3e?w=400&q=80" }
    ],
    faqs: [
      { question: "What is the pressure range of the AS-12?", answer: "The AS-12 is available in ranges from 0-1 bar up to 0-600 bar. Check the label on your unit for the specific range." },
      { question: "Is the AS-12 suitable for hazardous areas?", answer: "The standard AS-12 is not rated for hazardous areas. Use the AS-12-EX variant for ATEX Zone 1 installations." }
    ],
    troubleshooting: [
      { problem: "Output reads 0mA constantly", solution: "Check the loop power supply voltage (minimum 12V at the transmitter). Verify wiring polarity at the transmitter terminals." },
      { problem: "Reading drifts with temperature", solution: "Allow a 30-minute warm-up. If drift persists beyond specification, the sensor may require recalibration or replacement." }
    ],
    parts_links: [
      { part_number: "AS12-SEAL", name: "Process Seal Kit", url: "https://parts.example.com/as12-seal", price: 18.00 },
      { part_number: "AS12-CONN", name: "M12 Connector (4-pin)", url: "https://parts.example.com/as12-conn", price: 12.50 },
      { part_number: "AS12-DIAPH", name: "Replacement Diaphragm", url: "https://parts.example.com/as12-diaph", price: 45.00 }
    ]
  }
};

// Replace this with a real call to your SAGE ERP API once credentials are configured.
async function lookupInSage(serialNumber) {
  const sageApiUrl = secrets.get("SAGE_API_URL");
  const sageApiKey = secrets.get("SAGE_API_KEY");

  if (sageApiUrl && sageApiKey) {
    const res = await fetch(`${sageApiUrl}/products/${encodeURIComponent(serialNumber)}`, {
      headers: { "Authorization": `Bearer ${sageApiKey}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`SAGE ERP lookup failed: ${res.status}`);
    return await res.json();
  }

  // Stub: return sample data for known serials, otherwise not found.
  return SAMPLE_PRODUCTS[serialNumber] || null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const serialNumber = (body.serial_number || '').trim().toUpperCase();

    if (!serialNumber) {
      return Response.json({ error: 'Serial number is required' }, { status: 400 });
    }

    const product = await lookupInSage(serialNumber);

    if (!product) {
      return Response.json({ found: false, serial_number: serialNumber });
    }

    return Response.json({ found: true, product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}