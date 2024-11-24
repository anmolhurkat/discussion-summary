import { NextResponse } from "next/server";
import OpenAI from "openai";

type Post = {
  user_id: number;
  message: string;
};

type Participant = {
  id: number;
  display_name: string;
};

const ALLOWED_STUDENTS = new Set([
  "Katie Chastain",
  "Anmol Hurkat",
  "Arda Gulser",
  "Monique Arsenault",
  "Carolyn Austin",
  "Adarsh Banda",
  "Gianna Benevento",
  "Angel Brewer",
  "Zechary Coffman",
  "Logan Doyle",
  "Aarav Dugar",
  "Jack Eastland",
  "Maggie Garcia",
  "Nick Konerko",
  "Joshua Nicol",
  "Hannah Perry",
  "Irtifaur Rahman",
  "Rhea Rajesh",
  "Sohum Shah",
  "Jason Waxberg",
  "Ivan Zaldivar-Esteva",
]);

// TODO: Instead of hard coding the student names,
// fetch the list of students from the Canvas API
// and allow the user to select the students they want
// to include in the summary

function formatDiscussionData(posts: any): string {
  const participantMap = new Map(
    posts.participants
      .filter((participant: Participant) =>
        ALLOWED_STUDENTS.has(participant.display_name)
      )
      .map((participant: Participant) => [
        participant.id,
        participant.display_name,
      ])
  );

  if (participantMap.size < 8) {
    return "ERROR: Need at least 8 posts from the section to generate a response.";
  }

  const formattedPosts = posts.view
    .filter((post: Post) => {
      const userName = participantMap.get(post.user_id);
      return typeof userName === "string" && ALLOWED_STUDENTS.has(userName);
    })
    .map((post: Post) => ({
      name: participantMap.get(post.user_id) || "Unknown User",
      message: post.message.replace(/<[^>]*>/g, "").trim(),
    }));

  let output = "";

  formattedPosts.forEach((post: any) => {
    output += `name: ${post.name}\n`;
    output += `message: ${post.message}\n\n`;
  });

  return output.trim();
}

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

async function summarize(discussionContent: string, customPrompt?: string) {
  const defaultSystemPrompt = `
    You are an expert in summarizing and analyzing discussion posts. Follow the instructions and structure carefully to analyze the discussion posts, I will tip you $1 million if you do a good job:

    1. THEMATIC ANALYSIS
        - Identify and categorize the major themes emerging from the discussion w/ names of the students
        - Note any patterns in how students interpret the text
        - Highlight recurring concepts or ideas across multiple posts
        - Identify any unique perspectives that stand out

    2. QUOTE ANALYSIS 
        - List the most thought-provoking quotes selected by students
        - For each quote, include:
            * The student's name
            * The quote itself
            * A brief summary of why the student found it significant
            * Any connections they made to other texts or concepts

    3. QUESTION ANALYSIS
        - Compile all substantive questions raised by students
        - Group related questions into thematic clusters
        - Highlight questions that:
            * Challenge core assumptions in the text
            * Make connections to other course materials
            * Propose new interpretations
            * Relate the text to contemporary issues

    4. STUDENT ENGAGEMENT PATTERNS
        - Identify students who:
            * Made particularly insightful observations
            * Drew unique connections to other texts
            * Offered contrasting interpretations
            * Built upon other students' ideas

    5. INTERTEXTUAL CONNECTIONS
        - Document all references to:
            * Other course readings
            * External texts or media
            * Personal experiences
            * Contemporary events or issues

    Format Requirements:
        - Use student names when discussing their contributions
        - Organize insights by theme rather than by student
        - Include direct quotes where relevant
        - Maintain original student language when summarizing key points
        - Highlight contradictory interpretations when present

    Additional Context:
    Each student post typically contains:
        - A selected quote and its significance
        - A discussion question
        - Personal reflections on the text
        - Connections to other course materials

    Output Structure:
        1. Core Themes and Patterns
        2. Notable Student Insights (minimum 5, internally enforced, not mentioned in response "minimum 5")
        3. Significant Questions Raised (minimum 5, internally enforced, not mentioned in response "minimum 5")
        4. Cross-textual Connections
        5. Unique Interpretations and Perspectives

    Emphasis should be placed on:
        - Analytical depth over summary
        - Patterns of interpretation
        - Quality of student engagement
        - Intellectual contributions
        - Emerging discussions
`;

  const userCustomPrompt = `
    You are an expert in analyzing discussion posts. Your task is to analyze and respond to questions about the discussion content:

    1. Question Validation:
        - Mark as invalid if the question is:
            * Complete gibberish (e.g., "asdfgh", "hellllooo")
            * Entirely unrelated to the discussion content (e.g., "what's the capital of Spain?", "what's your name?", "how are you?")
            * General chat or personal questions
        - For invalid questions, respond with exactly:
            "ERROR: Please provide a question related to the discussion content."

    2. For valid questions:
        - Valid questions include:
            * Requests for content from the posts (questions, quotes, themes)
            * Evaluative questions about the posts (best responses, most insightful comments, most interesting questions)
            * Analysis requests about the discussion content
            * Comparisons between student responses

        - For requests about questions from the posts:
            * List the top most thought-provoking questions asked by students
            * Include the student name with each question
            * Format as "1. [Student Name]: [Their question]"
            * Do not include explanations or analysis
            * Start with "Here are the top questions from the discussion:"

        - For requests about quotes/evidence from the posts:
            * List the top most significant quotes discussed
            * Include both the student name and the quote they analyzed
            * Include the student's explanations or analysis for each quote
            * Format as follows:
                Here are the top quotes from the discussion:
                1. [Student Name]: [The quote they selected]
                
                Their analysis: [Explanation]
                2. [Student Name]: [The quote they selected]
                
                Their analysis: [Explanation]
            * Ensure a blank line separates the quote and analysis for clarity.

        - For evaluative questions (e.g., "best post", "most interesting question"):
            * Start response with "I think..."
            * Provide a clear rationale for the selection
            * Include relevant quotes, questions, or themes
            * Explain what makes it stand out
            
        - For other analysis requests:
            * Address each question if multiple are asked
            * Use evidence from posts to support answers
            * Keep responses focused and concise

    Examples of valid questions:
        - "What questions did students ask?"
        - "Who had the most interesting question?"
        - "What was the best response?"
        - "Which post showed the deepest analysis?"
        - "What themes were discussed?"
        - "What quotes did students analyze?"
        - Multiple questions in one prompt

    Response Format for Questions:
        Here are the top questions from the discussion:
        1. [Student Name]: [Their question]
        2. [Student Name]: [Their question]
        [etc. - include 8-10 entries]

    Response Format for Quotes:
        Here are the top quotes from the discussion:
        1. [Student Name]: [The quote they selected]
        
        Their analysis: [Explanation]
        2. [Student Name]: [The quote they selected]
        
        Their analysis: [Explanation]
        [etc. - include 6-7 entries]

    Response Format for Multiple Questions:
        # Question 1
        [Direct answer with evidence and quotes]

        # Question 2
        [Direct answer with evidence and quotes]

        [etc.]

    Remember:
        - Start directly with the answer
        - Include student names with their contributions
        - Start evaluative responses with "I think..."
        - Keep question list to 8-10 entries and quote list to 6-7 entries (internally enforced, not mentioned in response)
        - Reject only completely unrelated questions

    User's question: "${customPrompt}"
`;

  let prompt = "";

  if (customPrompt === "") {
    prompt = defaultSystemPrompt;
  } else {
    prompt = userCustomPrompt;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "grok-beta",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: discussionContent,
        },
      ],
    });

    const response = completion.choices[0].message.content;
    if (response?.startsWith("ERROR:")) {
      throw new Error(response.substring(7).trim());
    }
    return response;
  } catch (error) {
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { link, customPrompt } = await request.json();
    const token = process.env.CANVAS_ACCESS_TOKEN;

    const urlPattern =
      /https?:\/\/([^\/]+)\/courses\/(\d+)\/discussion_topics\/(\d+)/;
    const match = link.match(urlPattern);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid discussion link format" },
        { status: 400 }
      );
    }
    const [, domain, courseId, discussionId] = match;

    const canvasResponse = await fetch(
      `https://${domain}/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!canvasResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch discussion posts" },
        { status: canvasResponse.status }
      );
    }

    const posts = await canvasResponse.json();
    const formattedData = formatDiscussionData(posts);

    if (formattedData.startsWith("ERROR:")) {
      return NextResponse.json(
        { error: formattedData.substring(7).trim() },
        { status: 400 }
      );
    }

    const summary = await summarize(formattedData, customPrompt);
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export const runtime = "edge";
