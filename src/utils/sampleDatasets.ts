export interface SampleDatasetSpec {
  id: string;
  title: string;
  domain: string;
  fileName: string;
  description: string;
  csvContent: string;
}

export const SAMPLE_DATASETS: SampleDatasetSpec[] = [
  {
    id: 'sample_retail_operations',
    title: 'Sample: Global Retail & E-Commerce Operations',
    domain: 'Sales & Retail',
    fileName: 'sample_retail_operations.csv',
    description: '30 transactions across North America, Europe, and APAC with orders, revenue, profit, discounts, and customer IDs.',
    csvContent: `Order_ID,Order_Date,Region,Category,Customer_ID,Units,Revenue,Cost,Profit,Discount_Pct
ORD-1001,2026-01-05,North America,Cloud Hardware,CUST-201,4,4800,2950,1850,5.0
ORD-1002,2026-01-12,Europe,Analytics Software,CUST-202,2,3200,900,2300,0.0
ORD-1003,2026-01-19,APAC,Office Peripherals,CUST-203,10,1450,980,470,10.0
ORD-1004,2026-01-24,North America,Analytics Software,CUST-204,5,7500,2100,5400,5.0
ORD-1005,2026-02-03,Europe,Cloud Hardware,CUST-205,3,3900,2500,1400,8.0
ORD-1006,2026-02-11,North America,Office Peripherals,CUST-201,12,1800,1150,650,5.0
ORD-1007,2026-02-18,LATAM,Analytics Software,CUST-206,1,1600,450,1150,0.0
ORD-1008,2026-02-26,APAC,Cloud Hardware,CUST-207,6,7200,4600,2600,12.0
ORD-1009,2026-03-04,Europe,Office Peripherals,CUST-202,8,1120,760,360,15.0
ORD-1010,2026-03-14,North America,Analytics Software,CUST-208,7,10500,2850,7650,0.0
ORD-1011,2026-03-21,APAC,Analytics Software,CUST-209,4,6000,1700,4300,5.0
ORD-1012,2026-03-29,LATAM,Cloud Hardware,CUST-210,2,2300,1780,520,18.0
ORD-1013,2026-04-06,North America,Cloud Hardware,CUST-211,5,6100,3750,2350,4.0
ORD-1014,2026-04-15,Europe,Analytics Software,CUST-212,6,9000,2450,6550,0.0
ORD-1015,2026-04-22,APAC,Office Peripherals,CUST-203,15,2100,1480,620,10.0
ORD-1016,2026-05-02,North America,Analytics Software,CUST-204,8,12000,3200,8800,0.0
ORD-1017,2026-05-11,Europe,Cloud Hardware,CUST-213,4,4600,3100,1500,10.0
ORD-1018,2026-05-19,LATAM,Office Peripherals,CUST-214,9,1170,920,250,20.0
ORD-1019,2026-05-27,North America,Office Peripherals,CUST-215,14,2240,1390,850,5.0
ORD-1020,2026-06-05,APAC,Analytics Software,CUST-209,5,7500,2050,5450,0.0
ORD-1021,2026-06-14,Europe,Analytics Software,CUST-216,4,5800,1650,4150,5.0
ORD-1022,2026-06-21,North America,Cloud Hardware,CUST-201,7,8400,5150,3250,5.0
ORD-1023,2026-06-28,LATAM,Analytics Software,CUST-206,3,4200,1280,2920,8.0
ORD-1024,2026-07-04,APAC,Cloud Hardware,CUST-217,5,5950,3880,2070,10.0
ORD-1025,2026-07-12,North America,Analytics Software,CUST-208,9,13500,3600,9900,0.0
ORD-1026,2026-07-20,Europe,Office Peripherals,CUST-218,11,1540,1090,450,12.0
ORD-1027,2026-07-29,APAC,Analytics Software,CUST-219,6,8700,2350,6350,5.0
ORD-1028,2026-08-05,North America,Cloud Hardware,CUST-211,6,7320,4400,2920,4.0
ORD-1029,2026-08-14,Europe,Analytics Software,CUST-212,7,10500,2800,7700,0.0
ORD-1030,2026-08-22,LATAM,Office Peripherals,CUST-214,10,1250,1020,230,22.0`,
  },
  {
    id: 'sample_marketing_campaigns',
    title: 'Sample: B2B Marketing Campaign Performance',
    domain: 'Marketing Campaign',
    fileName: 'sample_marketing_campaigns.csv',
    description: '20 campaign logs tracking spend, impressions, clicks, conversions, and attributed pipeline revenue.',
    csvContent: `Campaign_Name,Date,Channel,Spend,Impressions,Clicks,Conversions,Revenue
Q1 Search Brand,2026-01-15,Paid Search,4200,98000,5400,270,32400
Q1 LinkedIn Exec,2026-01-22,Paid Social,6800,142000,2950,118,29500
Q1 Webinar Series,2026-02-04,Events,3500,45000,1800,162,27540
Q1 Retargeting Display,2026-02-18,Display,2900,310000,1550,31,4650
Q2 Search NonBrand,2026-03-03,Paid Search,7400,165000,7260,326,45640
Q2 Content Syndication,2026-03-19,Email & Content,3100,62000,2480,148,19240
Q2 LinkedIn ABM,2026-04-07,Paid Social,8200,128000,3200,160,44800
Q2 Display Prospecting,2026-04-21,Display,4100,420000,1680,25,3500
Q2 Partner CoMarketing,2026-05-08,Partners,2800,38000,1900,152,25840
Q2 Product Launch Search,2026-05-25,Paid Search,6900,154000,8160,408,59160
Q3 Search Brand,2026-06-09,Paid Search,4500,112000,6380,319,41470
Q3 LinkedIn Video,2026-06-24,Paid Social,7500,195000,3900,136,31280
Q3 Virtual Summit,2026-07-11,Events,5200,78000,3120,280,50400
Q3 Newsletter Sponsor,2026-07-28,Email & Content,2400,51000,2295,137,17810
Q3 Display Awareness,2026-08-12,Display,3800,390000,1560,23,3220
Q3 Search Competitor,2026-08-29,Paid Search,8600,178000,7476,336,48720
Q4 Partner Webinar,2026-09-14,Partners,3200,44000,2200,187,33660
Q4 LinkedIn LeadGen,2026-09-28,Paid Social,7900,151000,3775,188,48880
Q4 Search Enterprise,2026-10-10,Paid Search,9100,189000,8505,425,68000
Q4 Email Nurture,2026-10-25,Email & Content,1950,48000,2640,198,27720`,
  },
];

export function downloadCsvFile(fileName: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
