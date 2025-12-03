

from typing import List, Literal, Optional

from pydantic import BaseModel

from app.database.entities.base_entity import BaseEntity
#from app.database.entities.base_entity import BaseEntity, PyObjectId


class LLMLabelField(BaseModel):
    label: str
    explanation: str
    possible_values: List[str] = [] # e.g. [positive, neutral, negative]  | leave empty if all values are acceptable. 
    type: Literal["string", "boolean", "category", "integer", "float"] # type of what the possible label can be 

    def parse_for_llm(self):
        
        if self.type == "boolean":
            return f"{self.label}: {self.explanation} -> Respond with True/False"
        elif self.type == "category":
            return f"{self.label}: '{self.explanation}' -> Possible values (pick 1): {self.possible_values}"
        elif self.type == "integer":
            return f"{self.label}: {self.explanation} -> value must be an integer"
        elif self.type == "float":
            return f"{self.label}: {self.explanation} -> value must be an float"
        elif self.type == "string":
            return f"{self.label}: '{self.explanation}'"
        else:
            return f"{self.label}: '{self.explanation}'"


class LabelTemplateEntity(BaseEntity):
    user_id: str # PyObjectId
    category_name: str
    category_description: str
    is_public: bool = True
    labels: List[LLMLabelField] # List of the possible labels the llm can predict & also part of ground truth
    llm_prediction_fields_per_label: List[LLMLabelField] # extra labels predicted for each of the predicted labels.  such as reason
    multi_label_possible: bool # whether LLM should pick a single or may pick multiple


    def convert_llm_prediction_format(self):
        
        def parse_llm_prediction_field_global():
            text_to_add = ""
            for global_field in self.llm_prediction_field_global:
                if text_to_add: 
                    text_to_add += ",\n"
                text_to_add += global_field.parse_for_llm()
            if text_to_add:
                text_to_add += "\n"
            return text_to_add
        
        def parse_per_label_text():
            text_to_add  = ""
            for per_label_field in self.llm_prediction_fields_per_label:
                if text_to_add: 
                    text_to_add += ",\n"
                text_to_add += per_label_field.parse_for_llm()
            
            return text_to_add
        
        def parse_labels():
            text_to_add = "YOU CAN PICK MULTIPLE LABELS IF IT APPLIES" if self.multi_label_possible else "PICK ONLY A SIGNLE LABEL FROM THE LABELS BELOW"
            for label in self.labels:
                text_to_add +=label.parse_for_llm()
                per_label_text = parse_per_label_text()
                if per_label_text:
                    text_to_add += ",\n" + per_label_text
            
            return text_to_add
                
                
        prompt = """


        expected_format: {
            {{labels}}
            {{llm_prediction_field_global}}

          }
        """\
        .replace("{{llm_prediction_field_global}}", parse_llm_prediction_field_global())\
        .replace("{{labels}}", parse_labels())
        return prompt


if __name__ == "__main__":
    label_template_entity = LabelTemplateEntity(user_id="1",
                                              category_name="Painpoint analysis categories",
                                              category_description="these categories explain the painpoints of possible customes",
                                              is_public=True,
                                              llm_prediction_field_global=[LLMLabelField(
                                                  label="sentiment",
                                                  explanation="the sentiment of the redditor in the message",
                                                  type="boolean")],
                                              labels=[
                                                  LLMLabelField(
                                                      label="problem_description",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="frustration_expression",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="solution_seeking",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="solution_proposing",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="agreement_empathy",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="none_of_the_above",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  )
                                                  
                                                  ],
                                                  multi_label_possible=True,
                                                  llm_prediction_fields_per_label=[ LLMLabelField(
                                                      label="reason",
                                                      explanation="the reasoning for your choice for the label ",
                                                      type="string"
                                                  )]

                                              )
    print()
    print(label_template_entity.convert_llm_prediction_format())