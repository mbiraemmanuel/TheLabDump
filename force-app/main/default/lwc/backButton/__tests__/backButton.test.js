import { createElement } from 'lwc';
import BackButton from 'c/backButton';

describe('c-back-button', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders button with correct label', () => {
        const element = createElement('c-back-button', {
            is: BackButton
        });
        document.body.appendChild(element);

        const button = element.shadowRoot.querySelector('lightning-button');
        expect(button).not.toBeNull();
        expect(button.label).toBe('Back');
    });

    it('button has back icon', () => {
        const element = createElement('c-back-button', {
            is: BackButton
        });
        document.body.appendChild(element);

        const button = element.shadowRoot.querySelector('lightning-button');
        expect(button.iconName).toBe('utility:back');
        expect(button.iconPosition).toBe('left');
    });

    it('calls history.back on button click', () => {
        // Mock window.history.back
        const mockBack = jest.fn();
        window.history.back = mockBack;
        window.history.length = 2;

        const element = createElement('c-back-button', {
            is: BackButton
        });
        document.body.appendChild(element);

        const button = element.shadowRoot.querySelector('lightning-button');
        button.click();

        expect(mockBack).toHaveBeenCalled();
    });
});
