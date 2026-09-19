type Props = {
  html: string;
};

/** Renders cleaned WordPress HTML with prose styles. */
export function PostContent({ html }: Props) {
  return (
    <div
      className="post-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
