/**
 * Centralized CSV column name constants.
 * All CSV/spreadsheet column names used across import services
 * are defined here to avoid magic strings scattered across the codebase.
 * 
 * If a CSV header changes, update it in one place here.
 */

const CSV_COLUMNS = {
    // Core student fields
    ENROLLMENT_NO: 'Enrollment No.',
    STUDENT_NAME: 'Student Name',
    COLLEGE_SHIFT: 'College Shift',
    PRIMARY_EMAIL: 'Primary Email ID',
    STUDENT_EMAIL: 'Student JIMS Email Id',
    MOBILE_NUMBER: 'Mobile Number',
    GENDER: 'Gender',
    DOB: 'Date of Birth (DD/MM/YYYY Format Only)',
    LINKEDIN: 'LinkedIn Profile Link',
    GITHUB: 'GitHub Profile Link',
    TECHNICAL_SKILLS: 'Technical Skills',
    PAN_INDIA: 'Open to Pan India Location',
    RESIDENCE: 'Student Residence / Belong to',
    COURSE: 'Course',

    // Academics
    BOARD_10TH: '10th Board Name',
    PASSING_YEAR_10TH: '10th passing Year',
    PERCENTAGE_10TH: '10th %',
    BOARD_12TH: '12th Board Name',
    PASSING_YEAR_12TH: '12th Passing Year',
    PERCENTAGE_12TH: '12th %',
    STREAM_12TH: '12th Stream',
    GRAD_COLLEGE: 'Graduation College/ Institute Name',
    GRAD_PASSING_YEAR: 'Graduation Passing Year',
    GRAD_PERCENTAGE: 'Graduation %',
    GRAD_STREAM: 'Graduation Stream',

    // Semesters
    semSGPA: (n) => `Sem ${n} SGPA`,

    // Family
    FATHER_NAME: 'Fathers Name',
    FATHER_OCCUPATION: 'Father Occupation',
    FATHER_EMAIL: 'Fathers Email ID',
    FATHER_MOBILE: 'Father Mobile No.',
    MOTHER_NAME: 'Mothers Name',
    MOTHER_MOBILE: 'Mothers Mobile Number',
    MOTHER_EMAIL: 'Mothers Email ID',

    // Addresses
    PERMANENT_ADDRESS: 'Permanent Address',
    CURRENT_ADDRESS: 'Current Address',

    // Gaps
    ANY_GAP: 'Any Gap',
    GAP_REASON: 'Reason of Gap ( if no gap , write NA)',

    // Experience
    PREVIOUS_EXPERIENCE: 'Any previous work Experience',
    EXPERIENCE_DESC: 'What you have done',
    INTERNSHIP_DETAILS: 'Internship /Project Details ( otherwise write NA)',

    // Placements
    PLACED_COMPANY: 'Placed Company Name',
    PLACEMENT_STATUS: 'Current Placement Status',
    CAMPUS_OFFER: 'Any Previous campus selection/ offer in Graduation.',

    // CIE
    CIE_SUBJECT: 'Subject',
    CIE_MARKS: 'Marks',
    CIE_SEMESTER_NUMBER: 'Semester Number',
};

module.exports = CSV_COLUMNS;
