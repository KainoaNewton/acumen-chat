import { ReactNode, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  // Function to convert markdown to HTML-like elements
  const renderMarkdown = (text: string): ReactNode[] => {
    // Split the content by line breaks to process code blocks
    const lines = text.split('\n');
    const result: ReactNode[] = [];
    let inCodeBlock = false;
    let currentCodeBlock: string[] = [];
    let codeLanguage = '';
    
    // List tracking
    let inOrderedList = false;
    let inUnorderedList = false;
    let currentList: ReactNode[] = [];

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for code blocks
      if (line.startsWith('```')) {
        // End any current list if we start a code block
        if (!inCodeBlock && (inOrderedList || inUnorderedList)) {
          addListToResult();
        }
        
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
          currentCodeBlock = [];
        } else {
          // End of code block
          inCodeBlock = false;
          const codeContent = currentCodeBlock.join('\n');
          result.push(
            <CodeBlock 
              key={`code-${i}`} 
              code={codeContent} 
              language={codeLanguage} 
            />
          );
        }
        continue;
      }

      // If we're in a code block, add the line to the current code block
      if (inCodeBlock) {
        currentCodeBlock.push(line);
        continue;
      }
      
      // Check for list items
      const orderedListMatch = line.match(/^(\d+)\.\s(.+)$/);
      const unorderedListMatch = line.match(/^[-*]\s(.+)$/);
      
      if (orderedListMatch) {
        // End unordered list if we're starting an ordered list
        if (inUnorderedList) {
          addListToResult();
          inUnorderedList = false;
        }
        
        // Start a new ordered list if we're not in one
        if (!inOrderedList) {
          inOrderedList = true;
          currentList = [];
        }
        
        // Add the item to the current list
        currentList.push(
          <li key={`li-${i}`}>
            {processTextWithInlineStyles(orderedListMatch[2])}
          </li>
        );
        continue;
      } else if (unorderedListMatch) {
        // End ordered list if we're starting an unordered list
        if (inOrderedList) {
          addListToResult();
          inOrderedList = false;
        }
        
        // Start a new unordered list if we're not in one
        if (!inUnorderedList) {
          inUnorderedList = true;
          currentList = [];
        }
        
        // Add the item to the current list
        currentList.push(
          <li key={`li-${i}`}>
            {processTextWithInlineStyles(unorderedListMatch[1])}
          </li>
        );
        continue;
      } else if (line.trim() === '') {
        // Empty line ends a list
        if (inOrderedList || inUnorderedList) {
          addListToResult();
          inOrderedList = false;
          inUnorderedList = false;
        }
        
        // Add an empty line
        result.push(<div key={`line-${i}`} className="h-2"></div>);
        continue;
      } else if (inOrderedList || inUnorderedList) {
        // If line doesn't match a list pattern but we're in a list, end the list
        addListToResult();
        inOrderedList = false;
        inUnorderedList = false;
      }
      
      // Process regular line
      result.push(
        <div key={`line-${i}`} className={i > 0 && lines[i-1].trim() !== '' ? "mt-1" : ""}>
          {processTextWithInlineStyles(line)}
        </div>
      );
    }
    
    // If we're still in a list at the end, add it
    if (inOrderedList || inUnorderedList) {
      addListToResult();
    }
    
    // If we're still in a code block at the end, add it as a regular text
    if (inCodeBlock && currentCodeBlock.length > 0) {
      result.push(
        <CodeBlock 
          key="last-code" 
          code={currentCodeBlock.join('\n')} 
          language={codeLanguage} 
        />
      );
    }

    return result;
    
    // Helper function to add the current list to the result
    function addListToResult() {
      if (currentList.length > 0) {
        result.push(
          inOrderedList 
            ? <ol key={`ol-${result.length}`} className="list-decimal pl-5 my-1">{currentList}</ol>
            : <ul key={`ul-${result.length}`} className="list-disc pl-5 my-1">{currentList}</ul>
        );
        currentList = [];
      }
    }
  };
  
  // Function to process text with inline styles (bold, italic, code, links)
  const processTextWithInlineStyles = (text: string): ReactNode[] => {
    // Process inline code first (because we don't want to process markdown inside code blocks)
    const inlineCodeMatches: ReactNode[] = [];
    const inlineCodeRegex = /`([^`]+)`/g;
    let inlineMatch;
    let lastIndex = 0;
    
    while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
      // Add text before the code block
      if (inlineMatch.index > lastIndex) {
        inlineCodeMatches.push(text.slice(lastIndex, inlineMatch.index));
      }
      
      // Add the code block
      inlineCodeMatches.push(
        <code 
          key={`inline-${inlineMatch.index}`} 
          className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-sm"
        >
          {inlineMatch[1]}
        </code>
      );
      
      lastIndex = inlineMatch.index + inlineMatch[0].length;
    }
    
    // Add the rest of the text
    if (lastIndex < text.length) {
      inlineCodeMatches.push(text.slice(lastIndex));
    }
    
    // Further process other styles
    const processInlineStyles = (nodes: ReactNode[]): ReactNode[] => {
      return nodes.map((node, idx) => {
        if (typeof node !== 'string') return node;
        
        // Process links - [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const linkParts: ReactNode[] = [];
        
        let linkMatch;
        let linkLastIndex = 0;
        
        while ((linkMatch = linkRegex.exec(node)) !== null) {
          // Add text before the link
          if (linkMatch.index > linkLastIndex) {
            linkParts.push(node.slice(linkLastIndex, linkMatch.index));
          }
          
          // Add the link
          linkParts.push(
            <a 
              key={`link-${idx}-${linkMatch.index}`} 
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {linkMatch[1]}
            </a>
          );
          
          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }
        
        // Add the rest of the text
        if (linkLastIndex < node.length) {
          linkParts.push(node.slice(linkLastIndex));
        }
        
        // If no links were found, process bold and italic
        const textParts = linkParts.length > 0 ? linkParts : [node];
        
        // Process bold text with ** or __
        return textParts.map((part, partIdx) => {
          if (typeof part !== 'string') return part;
          
          const boldRegex = /(\*\*|__)(.*?)\1/g;
          const boldParts: ReactNode[] = [];
          
          let boldMatch;
          let boldLastIndex = 0;
          
          while ((boldMatch = boldRegex.exec(part)) !== null) {
            // Add text before the bold
            if (boldMatch.index > boldLastIndex) {
              boldParts.push(part.slice(boldLastIndex, boldMatch.index));
            }
            
            // Add the bold text
            boldParts.push(
              <strong key={`bold-${idx}-${partIdx}-${boldMatch.index}`} className="font-semibold">
                {boldMatch[2]}
              </strong>
            );
            
            boldLastIndex = boldMatch.index + boldMatch[0].length;
          }
          
          // Add the rest of the text
          if (boldLastIndex < part.length) {
            boldParts.push(part.slice(boldLastIndex));
          }
          
          // If no bold text was found, just return the original part
          if (boldParts.length === 0) return part;
          
          // Process italic text within each part
          return boldParts.map((bPart, bPartIdx) => {
            if (typeof bPart !== 'string') return bPart;
            
            // Process italic text with * or _
            const italicRegex = /(\*|_)(.*?)\1/g;
            const italicParts: ReactNode[] = [];
            
            let italicMatch;
            let italicLastIndex = 0;
            
            while ((italicMatch = italicRegex.exec(bPart)) !== null) {
              // Add text before the italic
              if (italicMatch.index > italicLastIndex) {
                italicParts.push(bPart.slice(italicLastIndex, italicMatch.index));
              }
              
              // Add the italic text
              italicParts.push(
                <em key={`italic-${idx}-${partIdx}-${bPartIdx}-${italicMatch.index}`} className="italic">
                  {italicMatch[2]}
                </em>
              );
              
              italicLastIndex = italicMatch.index + italicMatch[0].length;
            }
            
            // Add the rest of the text
            if (italicLastIndex < bPart.length) {
              italicParts.push(bPart.slice(italicLastIndex));
            }
            
            // If no italic text was found, just return the original part
            if (italicParts.length === 0) return bPart;
            
            return italicParts;
          });
        });
      });
    };
    
    // Process all inline styles
    const processedParts = processInlineStyles(inlineCodeMatches.length > 0 ? inlineCodeMatches : [text]);
    
    // Flatten the array to handle nested arrays from style processing
    return processedParts.flat(3);
  }

  return (
    <div className="markdown-content whitespace-pre-wrap break-words max-w-none">
      {renderMarkdown(content)}
    </div>
  );
}

// Code block component with copy button and syntax highlighting
function CodeBlock({ code, language }: { code: string, language: string }) {
  const [copied, setCopied] = useState(false);
  
  // Determine display language based on input
  const displayLanguage = language ? 
    language.replace(/^(language-)?/, '') : 
    'code';
  
  // Function to apply basic syntax highlighting
  const highlightSyntax = (code: string, language: string) => {
    // If no specific language is defined, do basic highlighting
    if (!language || language === 'code') {
      return <span className="text-zinc-200">{code}</span>;
    }
    
    // Very basic syntax highlighting for common languages
    switch(language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return highlightJsTs(code);
      case 'html':
      case 'xml':
        return highlightHtml(code);
      case 'css':
      case 'scss':
        return highlightCss(code);
      case 'python':
      case 'py':
        return highlightPython(code);
      case 'bash':
      case 'sh':
        return highlightBash(code);
      case 'json':
        return highlightJson(code);
      default:
        // Basic fallback highlighting
        return <span className="text-zinc-200">{code}</span>;
    }
  };
  
  // Very basic syntax highlighting for JavaScript/TypeScript
  const highlightJsTs = (code: string) => {
    const tokenized = code.split(/(\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(function|const|let|var|if|else|return|import|export|class|interface|extends|implements|new|this|super|async|await|try|catch|finally|for|while|switch|case|break|continue|default|in|of|typeof|instanceof|void|delete|null|undefined|true|false)\b)/).filter(Boolean);
    
    return (
      <>
        {tokenized.map((token, i) => {
          if (token.match(/^\/\/.*$/)) return <span key={i} className="text-zinc-500">{token}</span>; // Comments
          if (token.match(/^\/\*[\s\S]*?\*\/$/)) return <span key={i} className="text-zinc-500">{token}</span>; // Multiline comments
          if (token.match(/^["'`].*["'`]$/)) return <span key={i} className="text-yellow-300">{token}</span>; // Strings
          if (token.match(/^\b(function|const|let|var|if|else|return|import|export|class|interface|extends|implements|new|this|super|async|await|try|catch|finally|for|while|switch|case|break|continue|default|in|of|typeof|instanceof|void|delete|null|undefined|true|false)\b$/)) 
            return <span key={i} className="text-purple-300">{token}</span>; // Keywords
          return <span key={i} className="text-zinc-200">{token}</span>; // Default
        })}
      </>
    );
  };
  
  // Very basic syntax highlighting for HTML
  const highlightHtml = (code: string) => {
    const tokenized = code.split(/(<[^>]*>|&[^;]+;)/).filter(Boolean);
    
    return (
      <>
        {tokenized.map((token, i) => {
          if (token.match(/^<[^>]*>$/)) return <span key={i} className="text-blue-300">{token}</span>; // Tags
          if (token.match(/^&[^;]+;$/)) return <span key={i} className="text-yellow-300">{token}</span>; // Entities
          return <span key={i} className="text-zinc-200">{token}</span>; // Content
        })}
      </>
    );
  };
  
  // Very basic syntax highlighting for CSS
  const highlightCss = (code: string) => {
    const tokenized = code.split(/([{}:;]|\/\*[\s\S]*?\*\/|\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)/).filter(Boolean);
    
    return (
      <>
        {tokenized.map((token, i) => {
          if (token.match(/^\/\*[\s\S]*?\*\/$/)) return <span key={i} className="text-zinc-500">{token}</span>; // Comments
          if (token.match(/^\.[a-zA-Z0-9_-]+$/)) return <span key={i} className="text-yellow-300">{token}</span>; // Classes
          if (token.match(/^#[a-zA-Z0-9_-]+$/)) return <span key={i} className="text-orange-300">{token}</span>; // IDs
          if (token.match(/^[{}:;]$/)) return <span key={i} className="text-blue-300">{token}</span>; // Punctuation
          return <span key={i} className="text-zinc-200">{token}</span>; // Default
        })}
      </>
    );
  };
  
  // Very basic syntax highlighting for Python
  const highlightPython = (code: string) => {
    const tokenized = code.split(/(#.*|\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|return|with|in|not|and|or|True|False|None)\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/).filter(Boolean);
    
    return (
      <>
        {tokenized.map((token, i) => {
          if (token.match(/^#.*$/)) return <span key={i} className="text-zinc-500">{token}</span>; // Comments
          if (token.match(/^["'].*["']$/)) return <span key={i} className="text-yellow-300">{token}</span>; // Strings
          if (token.match(/^\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|return|with|in|not|and|or|True|False|None)\b$/)) 
            return <span key={i} className="text-purple-300">{token}</span>; // Keywords
          return <span key={i} className="text-zinc-200">{token}</span>; // Default
        })}
      </>
    );
  };
  
  // Very basic syntax highlighting for Bash
  const highlightBash = (code: string) => {
    const tokenized = code.split(/(#.*|\$\w+|\b(if|then|else|fi|for|do|done|while|case|esac|function|echo|exit|return|source|alias|cd|export|read)\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/).filter(Boolean);
    
    return (
      <>
        {tokenized.map((token, i) => {
          if (token.match(/^#.*$/)) return <span key={i} className="text-zinc-500">{token}</span>; // Comments
          if (token.match(/^\$\w+$/)) return <span key={i} className="text-green-300">{token}</span>; // Variables
          if (token.match(/^["'].*["']$/)) return <span key={i} className="text-yellow-300">{token}</span>; // Strings
          if (token.match(/^\b(if|then|else|fi|for|do|done|while|case|esac|function|echo|exit|return|source|alias|cd|export|read)\b$/)) 
            return <span key={i} className="text-purple-300">{token}</span>; // Keywords
          return <span key={i} className="text-zinc-200">{token}</span>; // Default
        })}
      </>
    );
  };
  
  // Very basic syntax highlighting for JSON
  const highlightJson = (code: string) => {
    const tokenized = code.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b(true|false|null)\b|[{}\[\],])/).filter(Boolean);
    
    return (
      <>
        {tokenized.map((token, i) => {
          if (token.match(/^".*":$/)) return <span key={i} className="text-blue-300">{token}</span>; // Keys
          if (token.match(/^".*"$/)) return <span key={i} className="text-yellow-300">{token}</span>; // Strings
          if (token.match(/^\b(true|false|null)\b$/)) return <span key={i} className="text-purple-300">{token}</span>; // Keywords
          if (token.match(/^[{}\[\],]$/)) return <span key={i} className="text-zinc-400">{token}</span>; // Punctuation
          return <span key={i} className="text-zinc-200">{token}</span>; // Default
        })}
      </>
    );
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group my-2">
      <div className="bg-zinc-900 rounded-t-md py-1 px-3 text-xs flex justify-between items-center border-t border-l border-r border-zinc-700">
        <span className="font-mono text-zinc-400">
          {displayLanguage}
        </span>
        <button
          onClick={handleCopy}
          className="text-zinc-400 hover:text-zinc-100 focus:outline-none transition-colors p-1 rounded"
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <pre className="bg-zinc-800 p-3 rounded-t-none rounded-b-md overflow-x-auto border border-zinc-700 text-sm">
        <code className="font-mono">{highlightSyntax(code, displayLanguage)}</code>
      </pre>
    </div>
  );
} 