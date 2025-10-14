import * as React from 'react';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/themes/prism-tomorrow.css';

interface SyntaxHighlightedCodeProps {
  code: string;
  language: 'bash' | 'javascript' | 'python' | 'go';
}

export const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({
  code,
  language,
}) => {
  const codeRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <pre className="language-none" style={{ margin: 0 }}>
      <code ref={codeRef} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};
