const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom',
  'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
]);

const DOMAIN_TAGS: Record<string, string[]> = {
  'github.com': ['dev', 'code', 'open-source'],
  'gitlab.com': ['dev', 'code', 'open-source'],
  'bitbucket.org': ['dev', 'code'],
  'youtube.com': ['video', 'entertainment'],
  'youtu.be': ['video', 'entertainment'],
  'vimeo.com': ['video'],
  'medium.com': ['article', 'blog'],
  'dev.to': ['dev', 'article'],
  'stackoverflow.com': ['dev', 'q&a'],
  'reddit.com': ['social', 'news'],
  'twitter.com': ['social', 'news'],
  'x.com': ['social', 'news'],
  'linkedin.com': ['professional', 'network'],
  'instagram.com': ['social', 'photo'],
  'pinterest.com': ['design', 'inspiration'],
  'dribbble.com': ['design', 'inspiration'],
  'behance.net': ['design', 'portfolio'],
  'figma.com': ['design', 'tool'],
  'notion.so': ['productivity', 'tool'],
  'airtable.com': ['productivity', 'tool'],
  'canva.com': ['design', 'tool'],
  'udemy.com': ['course', 'education'],
  'coursera.org': ['course', 'education'],
  'edx.org': ['course', 'education'],
  'wikipedia.org': ['reference', 'wiki'],
  'docs.rs': ['dev', 'documentation'],
  'npmjs.com': ['dev', 'package'],
  'crates.io': ['dev', 'rust'],
  'pypi.org': ['dev', 'python'],
};

export function generateTags(url: string, title: string): string[] {
  const tags: string[] = [];
  const maxTags = 6;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    if (DOMAIN_TAGS[domain]) {
      tags.push(...DOMAIN_TAGS[domain]);
    } else {
      const parts = domain.split('.');
      if (parts.length > 1) {
        const tld = parts[parts.length - 1];
        const domainName = parts[parts.length - 2];
        
        if (['com', 'net', 'org'].includes(tld)) {
          tags.push(domainName);
        }
      }
    }
  } catch {
    console.log('Invalid URL for tag generation');
  }

  if (title) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word));
    
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    sortedWords.forEach(word => {
      if (tags.length < maxTags && !tags.includes(word)) {
        tags.push(word);
      }
    });
  }

  return tags.slice(0, maxTags);
}
