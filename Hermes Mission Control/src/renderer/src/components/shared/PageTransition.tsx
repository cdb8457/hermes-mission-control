import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const variants = {
  initial: { opacity: 0, y: 6, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: -4, scale: 0.995 }
}

const transition = {
  duration: 0.18,
  ease: [0.25, 0.1, 0.25, 1]
}

export function PageTransition({ children }: { children: ReactNode }): JSX.Element {
  return (
    <motion.div
      className="h-full w-full"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

/** Stagger children — wrap a list container with this */
export function StaggerList({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04 } }
      }}
    >
      {children}
    </motion.div>
  )
}

/** Individual stagger item */
export function StaggerItem({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } }
      }}
    >
      {children}
    </motion.div>
  )
}

/** Fade-in for individual elements */
export function FadeIn({
  children,
  className,
  delay = 0
}: {
  children: ReactNode
  className?: string
  delay?: number
}): JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/** Slide-in from side — for sidebars */
export function SlideIn({
  children,
  className,
  from = 'left'
}: {
  children: ReactNode
  className?: string
  from?: 'left' | 'right'
}): JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: from === 'left' ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/** Scale pop — for modals, cards */
export function ScalePop({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.16, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {children}
    </motion.div>
  )
}
