import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <RouterNavLink
          ref={ref}
          to={to}
          className={({ isActive, isPending }) =>
            cn(
              className,
              "transition-colors hover:text-blue-700 text-gray-900",
              isActive && cn(activeClassName, "text-blue-700 font-medium"),
              isPending && cn(pendingClassName, "text-blue-500")
            )
          }
          {...props}
        />
      </motion.div>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };