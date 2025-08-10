// Storage utility for managing user data persistence

export interface UserData {
  companyProfile: {
    companyName: string;
    industry: string;
    size: string;
    esgMaturity: string;
    asxListed: string;
    rseStatus: string;
    ngerReporter: string;
    ngerEmissions: string;
    consolidatedRevenue: string;
    grossAssets: string;
    employees: string;
  };
  disclosureEligibility: {
    [key: string]: string;
  };
  questionnaire: {
    [questionId: string]: any;
  };
  classification: {
    group: number | 'not-required';
    reportingStart: string; // legacy key
    assuranceRequired: boolean;
    reasoning: string[];
    // New fields for 2025 scope logic
    inScope?: boolean;
    classificationGroup?: 1 | 2 | 3 | 'voluntary';
    mandatoryReportingStartDate?: string;
  };
}

const STORAGE_KEYS = {
  COMPANY_PROFILE: 'companyProfileData',
  DISCLOSURE_ELIGIBILITY: 'disclosureEligibilityAnswers',
  QUESTIONNAIRE: 'questionnaireAnswers',
  CLASSIFICATION: 'classificationResult'
};

export const storage = {
  // Company Profile
  getCompanyProfile: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading company profile:', error);
      return null;
    }
  },

  saveCompanyProfile: (data: UserData['companyProfile']) => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving company profile:', error);
      return false;
    }
  },

  // Disclosure Eligibility
  getDisclosureEligibility: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DISCLOSURE_ELIGIBILITY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading disclosure eligibility:', error);
      return {};
    }
  },

  saveDisclosureEligibility: (data: UserData['disclosureEligibility']) => {
    try {
      localStorage.setItem(STORAGE_KEYS.DISCLOSURE_ELIGIBILITY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving disclosure eligibility:', error);
      return false;
    }
  },

  // Questionnaire
  getQuestionnaire: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUESTIONNAIRE);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      return {};
    }
  },

  saveQuestionnaire: (data: UserData['questionnaire']) => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE, JSON.stringify(data));
      // notify listeners in same tab
      window.dispatchEvent(new CustomEvent('questionnaire:updated'));
      return true;
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      return false;
    }
  },

  // Classification
  getClassification: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSIFICATION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading classification:', error);
      return null;
    }
  },

  saveClassification: (data: UserData['classification']) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSIFICATION, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving classification:', error);
      return false;
    }
  },

  // Get all user data
  getAllUserData: (): UserData => {
    return {
      companyProfile: storage.getCompanyProfile() || {},
      disclosureEligibility: storage.getDisclosureEligibility(),
      questionnaire: storage.getQuestionnaire(),
      classification: storage.getClassification()
    };
  },

  // Clear all data
  clearAllData: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  },

  // Check if user has any data
  hasUserData: (): boolean => {
    const companyProfile = storage.getCompanyProfile();
    const disclosureEligibility = storage.getDisclosureEligibility();
    const questionnaire = storage.getQuestionnaire();
    
    return !!(companyProfile || Object.keys(disclosureEligibility).length || Object.keys(questionnaire).length);
  }
}; 