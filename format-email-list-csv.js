/**
 * CSV Formatter for Cold Email Leads Import
 * 
 * Usage:
 * 1. Export your list from Apollo.io as CSV
 * 2. Save it as "apollo_export.csv"
 * 3. Run: node format-email-list-csv.js
 * 4. This will create "formatted_leads.csv" ready for import
 * 
 * Required input CSV columns:
 * - Email (or email, Email, EMAIL)
 * - First Name (or first_name, firstName, First Name)
 * - Last Name (or last_name, lastName, Last Name)
 * - Company Name (optional)
 * - Location (optional)
 */

const fs = require('fs');
const path = require('path');

// Configuration - SET THESE VALUES
const CONFIG = {
  inputFile: 'apollo_export.csv',
  outputFile: 'formatted_leads.csv',
  leadType: 'gigger', // 'gigger' or 'digger'
  defaultStatus: 'pending'
};

function formatCSV() {
  try {
    // Read input CSV
    console.log(`Reading ${CONFIG.inputFile}...`);
    const inputContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
    const lines = inputContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV Headers found:', header);

    // Find column indices (case-insensitive)
    const getColumnIndex = (possibleNames) => {
      for (const name of possibleNames) {
        const index = header.findIndex(h => 
          h.toLowerCase().replace(/\s+/g, '_') === name.toLowerCase()
        );
        if (index !== -1) return index;
      }
      return -1;
    };

    const emailIndex = getColumnIndex(['email', 'email_address', 'e-mail']);
    const firstNameIndex = getColumnIndex(['first_name', 'firstname', 'first name', 'fname', 'given_name']);
    const lastNameIndex = getColumnIndex(['last_name', 'lastname', 'last name', 'lname', 'surname', 'family_name']);
    const companyIndex = getColumnIndex(['company', 'company_name', 'company name', 'business_name']);
    const locationIndex = getColumnIndex(['location', 'city', 'address', 'location_name']);

    if (emailIndex === -1) {
      throw new Error('Email column not found. Please ensure your CSV has an "Email" column.');
    }

    console.log(`Found columns: Email=${emailIndex}, FirstName=${firstNameIndex}, LastName=${lastNameIndex}`);

    // Output header
    const outputHeader = ['email', 'first_name', 'last_name', 'lead_type', 'status'];
    const outputLines = [outputHeader.join(',')];

    // Process data rows
    let processed = 0;
    let skipped = 0;
    const seenEmails = new Set();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length < header.length) {
        console.warn(`Row ${i + 1}: Not enough columns, skipping`);
        skipped++;
        continue;
      }

      const email = (values[emailIndex] || '').trim().toLowerCase();
      
      // Skip if no email or duplicate
      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }

      if (seenEmails.has(email)) {
        console.warn(`Row ${i + 1}: Duplicate email ${email}, skipping`);
        skipped++;
        continue;
      }

      seenEmails.add(email);

      // Extract values (handle empty/null)
      const firstName = (values[firstNameIndex] || '').trim() || '';
      const lastName = (values[lastNameIndex] || '').trim() || '';
      const company = (values[companyIndex] || '').trim() || '';
      const location = (values[locationIndex] || '').trim() || '';

      // Build output row
      const outputRow = [
        email,
        firstName || '',
        lastName || '',
        CONFIG.leadType,
        CONFIG.defaultStatus
      ];

      outputLines.push(outputRow.map(val => `"${val}"`).join(','));
      processed++;
    }

    // Write output file
    fs.writeFileSync(CONFIG.outputFile, outputLines.join('\n'));
    
    console.log('\n✅ Formatting complete!');
    console.log(`📊 Statistics:`);
    console.log(`   - Processed: ${processed} rows`);
    console.log(`   - Skipped: ${skipped} rows`);
    console.log(`   - Output file: ${CONFIG.outputFile}`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Review ${CONFIG.outputFile}`);
    console.log(`   2. Import into Supabase cold_email_leads table`);
    console.log(`   3. Use Supabase Table Editor → Insert → Import from CSV`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current.trim());

  return values;
}

// Run formatter
console.log('🚀 Starting CSV formatting...\n');
console.log('Configuration:');
console.log(`  Input: ${CONFIG.inputFile}`);
console.log(`  Output: ${CONFIG.outputFile}`);
console.log(`  Lead Type: ${CONFIG.leadType}`);
console.log(`  Status: ${CONFIG.defaultStatus}\n`);

formatCSV();

