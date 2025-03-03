// contactSupport.js
import { LightningElement } from 'lwc';

export default class ContactSupport extends LightningElement {
    accordionSections = [
        { id: 'description', title: 'Description of Issue', content: 'Please provide a clear and concise description of the issue you\'re experiencing.' },
        { id: 'impact', title: 'Issue Impact', content: 'How many users are impacted by this issue and how it impacts your daily tasks. This allows us to understand the severity of your issues and provide the appropriate level of attention to it.' },
        { id: 'error', title: 'Error Message', content: 'If applicable, please provide any error messages you\'re seeing.' },
        { id: 'existing', title: 'Existing Issue?', content: 'Has this issue occurred before? If so, please provide details about previous occurrences.' },
        { id: 'steps', title: 'Steps to Reproduce', content: 'Please list the steps that lead to the issue occurring.' }
    ];
}