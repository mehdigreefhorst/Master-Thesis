import { useRouter } from "next/navigation"
import { Button } from "../ui"

interface HeaderStepProps{
  title: string;
  subtitle: string;
  onGoBack?: () => void;
  buttonGoBackText?: string;
  children?:  React.ReactNode;
  className?: string;
  
}
export const HeaderStep: React.FC<HeaderStepProps> = ({
  title,
  subtitle,
  onGoBack,
  buttonGoBackText,
  children,
  className}
) => {
  const router = useRouter()
  return (
    <div className={`flex mb-6 justify-between ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {children}
      <Button onClick={onGoBack ? onGoBack : () => router.back()} variant="secondary" size="lg">
        {buttonGoBackText ?? "← Go Back"}
      </Button>
    </div>
  )
}