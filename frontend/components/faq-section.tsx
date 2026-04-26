"use client"

import type React from "react"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqData = [
  {
    question: "What is WealthAgents and who is it for?",
    answer:
      "WealthAgents is an autonomous wealth management platform powered by 12 specialized AI agents. It's designed for anyone who wants sophisticated financial planning without the high fees of traditional wealth managers. Whether you're a young professional building your first nest egg or a family managing multi-generational wealth, our AI firm works for you.",
  },
  {
    question: "How do the 12 AI agents work together?",
    answer:
      "Our agents work in coordinated layers: First, analyst agents (Cash Flow, Retirement, Housing, Investment) analyze your profile in parallel. Then, Bull and Bear agents debate optimal strategies across 3 rounds. A facilitator agent determines the winner. An allocator proposes your plan, which three risk-persona agents then calibrate. Finally, a wealth manager synthesizes everything into your personalized plan.",
  },
  {
    question: "Can I see how the agents made their decisions?",
    answer:
      "Absolutely! Transparency is core to WealthAgents. You can watch each agent's reasoning in real-time through our live agent trace. Every card is clickable to reveal the full analysis, confidence scores, and reasoning. The complete transcript is always available so you understand exactly why your plan looks the way it does.",
  },
  {
    question: "What's included in the free Starter plan?",
    answer:
      "The Starter plan gives you access to the full 12-agent financial analysis, live agent trace visualization, basic allocation recommendations, and one wealth plan generation. It's perfect for experiencing how AI-powered wealth planning works before committing to a paid plan.",
  },
  {
    question: "How does the 'What-If' scenario analysis work?",
    answer:
      "With our Investor plan, you can modify key inputs and re-run the entire agent pipeline. Try scenarios like 'What if my salary drops 30%?' or 'What if I delay buying a house by 3 years?' The system shows a side-by-side comparison of how the Bull/Bear debate shifts, how risk calibration changes, and how your allocation adapts.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "Your security is our top priority. We use bank-level encryption for all data transmission and storage. Your financial information is never shared with third parties. We're SOC 2 compliant and undergo regular security audits. You can delete your data at any time, and we never sell your information.",
  },
]

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggle()
  }
  return (
    <div
      className={`w-full bg-[rgba(231,236,235,0.08)] shadow-[0px_2px_4px_rgba(0,0,0,0.16)] overflow-hidden rounded-[10px] outline outline-1 outline-border outline-offset-[-1px] transition-all duration-500 ease-out cursor-pointer`}
      onClick={handleClick}
    >
      <div className="w-full px-5 py-[18px] pr-4 flex justify-between items-center gap-5 text-left transition-all duration-300 ease-out">
        <div className="flex-1 text-foreground text-base font-medium leading-6 break-words">{question}</div>
        <div className="flex justify-center items-center">
          <ChevronDown
            className={`w-6 h-6 text-muted-foreground-dark transition-all duration-500 ease-out ${isOpen ? "rotate-180 scale-110" : "rotate-0 scale-100"}`}
          />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
        style={{
          transitionProperty: "max-height, opacity, padding",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className={`px-5 transition-all duration-500 ease-out ${isOpen ? "pb-[18px] pt-2 translate-y-0" : "pb-0 pt-0 -translate-y-2"}`}
        >
          <div className="text-foreground/80 text-sm font-normal leading-6 break-words">{answer}</div>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())
  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }
  return (
    <section className="w-full pt-[66px] pb-20 md:pb-40 px-5 relative flex flex-col justify-center items-center">
      <div className="w-[300px] h-[500px] absolute top-[150px] left-1/2 -translate-x-1/2 origin-top-left rotate-[-33.39deg] bg-primary/10 blur-[100px] z-0" />
      <div className="self-stretch pt-8 pb-8 md:pt-14 md:pb-14 flex flex-col justify-center items-center gap-2 relative z-10">
        <div className="flex flex-col justify-start items-center gap-4">
          <h2 className="w-full max-w-[435px] text-center text-foreground text-4xl font-semibold leading-10 break-words">
            Frequently Asked Questions
          </h2>
          <p className="self-stretch text-center text-muted-foreground text-sm font-medium leading-[18.20px] break-words">
            Everything you need to know about WealthAgents and how your personal AI firm makes decisions
          </p>
        </div>
      </div>
      <div className="w-full max-w-[600px] pt-0.5 pb-10 flex flex-col justify-start items-start gap-4 relative z-10">
        {faqData.map((faq, index) => (
          <FAQItem key={index} {...faq} isOpen={openItems.has(index)} onToggle={() => toggleItem(index)} />
        ))}
      </div>
    </section>
  )
}
